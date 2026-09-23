import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UserProxy } from '~/infrastructure/proxy/user-proxy'
import { signedInSessionStorage } from '../../fixtures/session-storage'
import { AccessTokenUnavailableError } from '~/domain/errors/access-token-unavailable-error'
import { AuthenticationRequiredError } from '~/domain/errors/authentication-required-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { CredentialsRejectedError } from '~/domain/errors/credentials-rejected-error'
import { CurrentPasswordRejectedError } from '~/domain/errors/current-password-rejected-error'
import { EmailAlreadyRegisteredError } from '~/domain/errors/email-already-registered-error'
import { SignInLockedError } from '~/domain/errors/sign-in-locked-error'
import { BackendRequestHooks } from '~/infrastructure/proxy/backend-request-hooks'

const BASE_URL = 'http://localhost:8080'

/** 用真正的 FetchError 當替身：它連不上時照樣有 response 屬性，只是值為 undefined。 */
function buildFetchError(failure: { status?: number, message?: string, lockedUntil?: string }) {
  const context = failure.status === undefined
    ? { request: BASE_URL, options: {}, error: new Error('fetch failed') }
    : {
        request: BASE_URL,
        options: {},
        response: {
          status: failure.status,
          statusText: 'rejected',
          _data: failure.message === undefined
            ? undefined
            : { message: failure.message, lockedUntil: failure.lockedUntil },
        },
      }

  return createFetchError(context as unknown as FetchContext)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('UserProxy.registerUser', () => {
  it('把後端給的那一位收成領域看得懂的形狀', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ id: 7, email: 'james@example.com' }))

    const signedInUser = await new UserProxy(BASE_URL, signedInSessionStorage()).registerUser('james@example.com', 'correct horse')

    expect(signedInUser.id).toBe(7)
    expect(signedInUser.email).toBe('james@example.com')
  })

  it('電子郵件被佔用是自己一種拒絕，不是一般的拒絕', async () => {
    // 畫面對它的反應不同：內容沒有錯，只是這個位址有人用了——
    // 兩格內容要留著，讓人改一個位址再送一次。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 409, message: '電子郵件「james@example.com」已經有人用了' })))

    await expect(new UserProxy(BASE_URL, signedInSessionStorage()).registerUser('james@example.com', 'correct horse'))
      .rejects.toBeInstanceOf(EmailAlreadyRegisteredError)
  })

  it('其餘的拒絕維持一般的拒絕', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 400, message: '密碼至少要 8 個字元' })))

    const failure = await new UserProxy(BASE_URL, signedInSessionStorage())
      .registerUser('james@example.com', 'short').catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(BackendRequestRejectedError)
    expect(failure).not.toBeInstanceOf(EmailAlreadyRegisteredError)
  })
})

/** 後端回的那一對憑證。 */
function sessionWire() {
  return {
    accessToken: 'a-signed-token',
    expiresAt: '2026-09-05T08:15:00Z',
    refreshToken: 'a-refresh-token',
    refreshTokenExpiresAt: '2026-10-05T08:00:00Z',
  }
}

describe('UserProxy.signIn', () => {
  it('把一對憑證與兩個到期時刻收成領域看得懂的形狀', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(sessionWire()))

    const session = await new UserProxy(BASE_URL, signedInSessionStorage()).signIn('james@example.com', 'correct horse')

    expect(session.accessToken).toBe('a-signed-token')
    expect(session.accessTokenExpiresAt.toISOString()).toBe('2026-09-05T08:15:00.000Z')
    expect(session.refreshToken).toBe('a-refresh-token')
    expect(session.refreshTokenExpiresAt.toISOString()).toBe('2026-10-05T08:00:00.000Z')
  })

  it('帳密對不上不算被登出——記著的那一份不動，也不通知任何人', async () => {
    // 登入這條路上的「沒有帶著有效的身分」是它自己的答案。交給共同出口去解讀，
    // 就會在登入畫面上把「密碼打錯」演成一次被登出。
    const sessionStorageProxy = signedInSessionStorage()
    const onSignedOut = vi.fn()
    const recoverSession = vi.fn()
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 401, message: '電子郵件或密碼不正確' })))

    const failure = await new UserProxy(BASE_URL, sessionStorageProxy, new BackendRequestHooks(onSignedOut, recoverSession))
      .signIn('james@example.com', 'wrong horse').catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(CredentialsRejectedError)
    expect(sessionStorageProxy.clearSession).not.toHaveBeenCalled()
    expect(onSignedOut).not.toHaveBeenCalled()
    // 也不會去換一對新的：密碼打錯換幾次都還是打錯，而續用憑證用一次就少一次。
    expect(recoverSession).not.toHaveBeenCalled()
  })

  it('換新的那一發自己被拒絕時不會再去換一次——那才是真的得重新登入了', async () => {
    // 少了這一條，救援自己會叫起救援：一次過期會變成一串換發，而每一次都作廢上一次。
    const recoverSession = vi.fn()
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 401, message: '請重新登入' })))

    const failure = await new UserProxy(BASE_URL, signedInSessionStorage(), new BackendRequestHooks(vi.fn(), recoverSession))
      .renewSession('a-refresh-token').catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(AuthenticationRequiredError)
    expect(recoverSession).not.toHaveBeenCalled()
  })

  it('帳密對不上是自己一種拒絕，訊息原文轉達', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 401, message: '電子郵件或密碼不正確' })))

    const failure = await new UserProxy(BASE_URL, signedInSessionStorage())
      .signIn('james@example.com', 'wrong horse').catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(CredentialsRejectedError)
    expect((failure as Error).message).toBe('電子郵件或密碼不正確')
  })

  it('後端簽不出憑證是另外一種——使用者改什麼都沒用', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 503, message: '尚未設定憑證簽章鑰匙' })))

    const failure = await new UserProxy(BASE_URL, signedInSessionStorage())
      .signIn('james@example.com', 'correct horse').catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(AccessTokenUnavailableError)
    expect(failure).not.toBeInstanceOf(CredentialsRejectedError)
  })

  it('後端沒啟動仍然是連不上，不會被當成帳密不正確', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({})))

    await expect(new UserProxy(BASE_URL, signedInSessionStorage()).signIn('james@example.com', 'correct horse'))
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })

  it('帳號被鎖住是自己一種拒絕，而且帶著什麼時候可以再試', async () => {
    // 與帳密對不上非分開不可：使用者該做的事完全相反——一個是再打一次密碼，
    // 另一個是不要再打了。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({
      status: 429,
      message: '這個帳號因為連續登入失敗已被鎖住，2026-09-12T08:00:00Z 之後才能再試',
      lockedUntil: '2026-09-12T08:00:00Z',
    })))

    const failure = await new UserProxy(BASE_URL, signedInSessionStorage())
      .signIn('james@example.com', 'correct horse').catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(SignInLockedError)
    expect(failure).not.toBeInstanceOf(CredentialsRejectedError)
    expect((failure as SignInLockedError).lockedUntil)
      .toEqual(new Date('2026-09-12T08:00:00Z'))
  })

  it('那個時刻取自它自己那一格，不是從寫給人看的那句話裡挖出來的', async () => {
    // 句子改寫的那天，挖不到的人不會知道自己挖不到了。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({
      status: 429,
      message: '這句話裡一個時間都沒有',
      lockedUntil: '2026-09-12T08:00:00Z',
    })))

    const failure = await new UserProxy(BASE_URL, signedInSessionStorage())
      .signIn('james@example.com', 'correct horse').catch((error: unknown) => error)

    expect((failure as SignInLockedError).lockedUntil)
      .toEqual(new Date('2026-09-12T08:00:00Z'))
  })

  it('後端說不出什麼時候可以再試，仍然是被鎖住——不是帳密不正確', async () => {
    // 少一句話能說，好過退回去說「電子郵件或密碼不正確」：那一句會讓使用者
    // 繼續試密碼，正是這道鎖要終結的行為。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({
      status: 429,
      message: '這個帳號因為連續登入失敗已被鎖住',
    })))

    const failure = await new UserProxy(BASE_URL, signedInSessionStorage())
      .signIn('james@example.com', 'correct horse').catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(SignInLockedError)
    expect((failure as SignInLockedError).lockedUntil).toBeNull()
  })

  it('讀不出來的時刻收成沒有，而不是把整個拒絕一起丟掉', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({
      status: 429,
      message: '這個帳號因為連續登入失敗已被鎖住',
      lockedUntil: '下禮拜三吧',
    })))

    const failure = await new UserProxy(BASE_URL, signedInSessionStorage())
      .signIn('james@example.com', 'correct horse').catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(SignInLockedError)
    expect((failure as SignInLockedError).lockedUntil).toBeNull()
  })
})

describe('UserProxy：後端給的時刻', () => {
  it.each([
    { name: '登入憑證的到期時刻讀不出來', field: 'expiresAt' },
    { name: '續用憑證的到期時刻讀不出來', field: 'refreshTokenExpiresAt' },
  ])('$name 時當場拒絕，不往下傳一個壞掉的日期', async ({ field }) => {
    // 往下傳的話：記住它時 toISOString() 會拋，而儲存那一側保證不拋、於是把它吞掉——
    // 結果是登入看起來成功了卻什麼都沒記住，使用者每次重新整理都要重登，
    // 而畫面上沒有任何一句話解釋為什麼。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ ...sessionWire(), [field]: 'not-a-date' }))

    await expect(new UserProxy(BASE_URL, signedInSessionStorage()).signIn('james@example.com', 'correct horse'))
      .rejects.toBeInstanceOf(BackendRequestRejectedError)
  })
})

describe('UserProxy.renewSession', () => {
  it('帶著續用憑證去換，並把換回來的一對收乾淨', async () => {
    const fetchStub = vi.fn().mockResolvedValue(sessionWire())
    vi.stubGlobal('$fetch', fetchStub)

    const session = await new UserProxy(BASE_URL, signedInSessionStorage()).renewSession('an-older-token')

    expect(fetchStub).toHaveBeenCalledWith(
      `${BASE_URL}/sessions/renewal`,
      expect.objectContaining({ method: 'POST', body: { refreshToken: 'an-older-token' } }),
    )
    expect(session.refreshToken).toBe('a-refresh-token')
  })

  it('換發被拒絕與憑證不算數是同一種——分成兩種只會逼每個呼叫端寫兩次同樣的處理', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 401, message: '請重新登入' })))

    const failure = await new UserProxy(BASE_URL, signedInSessionStorage())
      .renewSession('a-stale-token').catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(AuthenticationRequiredError)
    expect(failure).not.toBeInstanceOf(CredentialsRejectedError)
  })

  it('後端簽不出憑證時說的是那件事，不是憑證不算數', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 503, message: '尚未設定憑證簽章鑰匙' })))

    const failure = await new UserProxy(BASE_URL, signedInSessionStorage())
      .renewSession('a-refresh-token').catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(AccessTokenUnavailableError)
  })

  it('後端沒啟動仍然是連不上——那不代表這份續用憑證壞了', async () => {
    // 說錯的代價很具體：後端一啟動，使用者就得重登一次。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({})))

    const failure = await new UserProxy(BASE_URL, signedInSessionStorage())
      .renewSession('a-refresh-token').catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(BackendUnreachableError)
    expect(failure).not.toBeInstanceOf(AuthenticationRequiredError)
  })
})

describe('UserProxy.revokeSession', () => {
  it('請後端撤掉這台裝置的登入階段', async () => {
    const fetchStub = vi.fn().mockResolvedValue(null)
    vi.stubGlobal('$fetch', fetchStub)

    await new UserProxy(BASE_URL, signedInSessionStorage()).revokeSession('a-refresh-token')

    expect(fetchStub).toHaveBeenCalledWith(
      `${BASE_URL}/sessions/revocation`,
      expect.objectContaining({ method: 'POST', body: { refreshToken: 'a-refresh-token' } }),
    )
  })

  it('後端連不上時如實拋出——要不要吞掉是呼叫端的決定，不是這一層的', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({})))

    await expect(new UserProxy(BASE_URL, signedInSessionStorage()).revokeSession('a-refresh-token'))
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })
})

describe('UserProxy.fetchSignedInUser', () => {
  it('帶著憑證去問，並把答案收成領域看得懂的形狀', async () => {
    const fetchStub = vi.fn().mockResolvedValue({ id: 7, email: 'james@example.com' })
    vi.stubGlobal('$fetch', fetchStub)

    const signedInUser = await new UserProxy(BASE_URL, signedInSessionStorage()).fetchSignedInUser('a-signed-token')

    expect(fetchStub).toHaveBeenCalledWith(
      `${BASE_URL}/users/me`,
      expect.objectContaining({ headers: { Authorization: 'Bearer a-signed-token' } }),
    )
    expect(signedInUser.email).toBe('james@example.com')
  })

  it('還沒被放行的人，開通狀態與那份指示一起收進來', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      id: 7,
      email: 'james@example.com',
      isEnabled: false,
      activationInstruction: {
        requestMailbox: 'gatekeeper@example.com',
        subject: 'console access request：james@example.com',
      },
    }))

    const signedInUser = await new UserProxy(BASE_URL, signedInSessionStorage())
      .fetchSignedInUser('a-signed-token')

    expect(signedInUser.isEnabled).toBe(false)
    expect(signedInUser.activationInstruction?.requestMailbox).toBe('gatekeeper@example.com')
    expect(signedInUser.activationInstruction?.subject)
      .toBe('console access request：james@example.com')
  })

  it('被放行之後，後端整個不給那個欄位——這一側就表示成「沒有」', async () => {
    // 收成一份空的指示的話，畫面就得自己判斷「這份算不算數」，
    // 而那個判斷遲早會有人寫錯一次。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      id: 7, email: 'james@example.com', isEnabled: true,
    }))

    const signedInUser = await new UserProxy(BASE_URL, signedInSessionStorage())
      .fetchSignedInUser('a-signed-token')

    expect(signedInUser.isEnabled).toBe(true)
    expect(signedInUser.activationInstruction).toBeNull()
  })

  it('憑證不算數時說的是「當作沒登入」，不是一般的拒絕', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 401, message: '請重新登入' })))

    await expect(new UserProxy(BASE_URL, signedInSessionStorage()).fetchSignedInUser('a-stale-token'))
      .rejects.toBeInstanceOf(AuthenticationRequiredError)
  })

  it('連不上後端不代表這份憑證壞了', async () => {
    // 這個差別是有代價的：說成憑證壞了，後端一啟動使用者就得重登一次。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({})))

    const failure = await new UserProxy(BASE_URL, signedInSessionStorage())
      .fetchSignedInUser('a-signed-token').catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(BackendUnreachableError)
    expect(failure).not.toBeInstanceOf(AuthenticationRequiredError)
  })
})

describe('UserProxy.changePassword', () => {
  it('把兩組密碼送去換密碼那一條路', async () => {
    const fetchStub = vi.fn().mockResolvedValue(null)
    vi.stubGlobal('$fetch', fetchStub)

    await new UserProxy(BASE_URL, signedInSessionStorage())
      .changePassword('correct horse', 'battery staple')

    expect(fetchStub).toHaveBeenCalledWith(
      `${BASE_URL}/users/me/password`,
      expect.objectContaining({
        method: 'POST',
        body: { currentPassword: 'correct horse', newPassword: 'battery staple' },
      }))
  })

  it('目前的密碼不正確是自己一種拒絕，不是「請重新登入」', async () => {
    // 後端刻意用 403 而不是 401 說這件事：這個人的登入好得很，錯的只是一格。
    // 認成 401 的話，畫面會把他帶回登入畫面——那是最不該做的反應。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 403, message: '目前的密碼不正確' })))

    const failure = await new UserProxy(BASE_URL, signedInSessionStorage())
      .changePassword('wrong horse', 'battery staple')
      .catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(CurrentPasswordRejectedError)
    expect((failure as Error).message).toBe('目前的密碼不正確')
  })

  it('新密碼被後端擋下來維持一般的拒絕', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 400, message: '密碼至少要 8 個字元' })))

    await expect(new UserProxy(BASE_URL, signedInSessionStorage())
      .changePassword('correct horse', 'short'))
      .rejects.toBeInstanceOf(BackendRequestRejectedError)
  })

  it('連不上後端維持連不上', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({})))

    await expect(new UserProxy(BASE_URL, signedInSessionStorage())
      .changePassword('correct horse', 'battery staple'))
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })
})
