import type { IUserProxy } from '~/domain/interface/i-user-proxy'
import { AccessToken } from '~/domain/models/entities/access-token'
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

type AccessTokenWire = {
  accessToken: string
  expiresAt: string
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

  async signIn(email: string, password: string): Promise<AccessToken> {
    try {
      const accessTokenWire = await this.requestBackend<AccessTokenWire>(SESSIONS_ENDPOINT, {
        method: 'POST',
        body: { email, password },
      })

      return new AccessToken(accessTokenWire.accessToken, new Date(accessTokenWire.expiresAt))
    }
    catch (error: unknown) {
      throw this.signInFailureOf(error)
    }
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
}
