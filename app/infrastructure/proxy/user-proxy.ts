import type { IUserProxy } from '~/domain/interface/i-user-proxy'
import { Session } from '~/domain/models/entities/session'
import { SignedInUser } from '~/domain/models/entities/signed-in-user'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { CredentialsRejectedError } from '~/domain/errors/credentials-rejected-error'
import { EmailAlreadyRegisteredError } from '~/domain/errors/email-already-registered-error'
import { AccessTokenUnavailableError } from '~/domain/errors/access-token-unavailable-error'
import { AuthenticationRequiredError } from '~/domain/errors/authentication-required-error'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const USERS_ENDPOINT = '/users'
const SESSIONS_ENDPOINT = '/sessions'
const SESSION_RENEWAL_ENDPOINT = '/sessions/renewal'
const SESSION_REVOCATION_ENDPOINT = '/sessions/revocation'
const SIGNED_IN_USER_ENDPOINT = '/users/me'

/** 後端用這三個狀態碼分別表示這三件事。只有這裡需要知道。 */
const CREDENTIALS_REJECTED_STATUS = 401
const EMAIL_ALREADY_REGISTERED_STATUS = 409
const ACCESS_TOKEN_UNAVAILABLE_STATUS = 503

/** 後端回傳的原始 wire 形狀，只存在於本檔內。 */
type SignedInUserWire = {
  id: number
  email: string
}

type SessionWire = {
  accessToken: string
  expiresAt: string
  refreshToken: string
  refreshTokenExpiresAt: string
}

/**
 * Proxy：打使用者那三條路，並把三種「其實是業務答案」的拒絕從一般的拒絕裡分出來。
 *
 * 三者非分開不可，因為使用者對它們該做的事完全不同：帳密不正確要重打一次、
 * 電子郵件被佔用要換一個位址或改去登入、後端簽不出憑證則什麼都不必改——
 * 那不是他的問題。
 */
export class UserProxy extends BackendApiProxy implements IUserProxy {
  async registerUser(email: string, password: string): Promise<SignedInUser> {
    try {
      const signedInUserWire = await this.requestBackend<SignedInUserWire>(USERS_ENDPOINT, {
        method: 'POST',
        body: { email, password },
      })

      return this.toSignedInUser(signedInUserWire)
    }
    catch (error: unknown) {
      throw this.registrationFailureOf(error)
    }
  }

  async signIn(email: string, password: string): Promise<Session> {
    try {
      return this.toSession(await this.requestBackend<SessionWire>(SESSIONS_ENDPOINT, {
        method: 'POST',
        body: { email, password },
      }))
    }
    catch (error: unknown) {
      throw this.signInFailureOf(error)
    }
  }

  async renewSession(refreshToken: string): Promise<Session> {
    try {
      return this.toSession(await this.requestBackend<SessionWire>(SESSION_RENEWAL_ENDPOINT, {
        method: 'POST',
        body: { refreshToken },
      }))
    }
    catch (error: unknown) {
      // 換發被拒絕與「我是誰」被拒絕是同一件事：這一段不算數了，得重新登入。
      // 分成兩種錯誤只會逼每個呼叫端都寫兩次同樣的處理。
      if (error instanceof BackendRequestRejectedError
        && error.status === CREDENTIALS_REJECTED_STATUS) {
        throw new AuthenticationRequiredError(error.message, { cause: error })
      }

      throw this.signInFailureOf(error)
    }
  }

  async revokeSession(refreshToken: string): Promise<void> {
    await this.requestBackend<null>(SESSION_REVOCATION_ENDPOINT, {
      method: 'POST',
      body: { refreshToken },
    })
  }

  async fetchSignedInUser(accessToken: string): Promise<SignedInUser> {
    try {
      const signedInUserWire = await this.requestBackend<SignedInUserWire>(
        SIGNED_IN_USER_ENDPOINT,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )

      return this.toSignedInUser(signedInUserWire)
    }
    catch (error: unknown) {
      if (error instanceof BackendRequestRejectedError
        && error.status === CREDENTIALS_REJECTED_STATUS) {
        throw new AuthenticationRequiredError(error.message, { cause: error })
      }

      throw error
    }
  }

  private registrationFailureOf(error: unknown): unknown {
    if (error instanceof BackendRequestRejectedError
      && error.status === EMAIL_ALREADY_REGISTERED_STATUS) {
      return new EmailAlreadyRegisteredError(error.message, { cause: error })
    }

    return error
  }

  /**
   * 後端簽不出憑證是伺服器端的狀況，所以它到得了這裡時是 BackendServerError 而不是
   * 一般的拒絕——這一段因此要認的是那一種，不是 5xx 以下的那一種。
   */
  private signInFailureOf(error: unknown): unknown {
    if (error instanceof BackendRequestRejectedError
      && error.status === CREDENTIALS_REJECTED_STATUS) {
      return new CredentialsRejectedError(error.message, { cause: error })
    }

    if (error instanceof BackendServerError
      && error.status === ACCESS_TOKEN_UNAVAILABLE_STATUS) {
      return new AccessTokenUnavailableError(error.message, { cause: error })
    }

    return error
  }

  private toSignedInUser(signedInUserWire: SignedInUserWire): SignedInUser {
    return new SignedInUser(signedInUserWire.id, signedInUserWire.email)
  }

  /**
   * 兩個時刻在這裡就從字串收成日期。晚一步收的話，「這份憑證還有效嗎」這個判斷
   * 就得在領域裡處理字串——那是 wire 格式漏進來的樣子。
   *
   * 讀不出來的時刻**當場就是一次拒絕**，不是一個 `Invalid Date` 往下傳。往下傳的話，
   * 記住它時 `toISOString()` 會拋，而儲存那一側保證不拋、於是把它吞掉——
   * 結果是登入看起來成功了，卻什麼都沒被記住，使用者每次重新整理都要重登，
   * 而畫面上沒有任何一句話解釋為什麼。
   */
  private toSession(sessionWire: SessionWire): Session {
    return new Session(
      sessionWire.accessToken,
      this.momentIn(sessionWire.expiresAt),
      sessionWire.refreshToken,
      this.momentIn(sessionWire.refreshTokenExpiresAt),
    )
  }

  private momentIn(value: string): Date {
    const moment = new Date(value)
    if (Number.isNaN(moment.getTime())) {
      throw new BackendRequestRejectedError(`後端給了一個讀不出來的時刻：「${value}」`)
    }

    return moment
  }
}
