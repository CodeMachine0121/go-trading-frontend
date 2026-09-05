import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UserProxy } from '~/infrastructure/proxy/user-proxy'
import { AccessTokenUnavailableError } from '~/domain/errors/access-token-unavailable-error'
import { AuthenticationRequiredError } from '~/domain/errors/authentication-required-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { CredentialsRejectedError } from '~/domain/errors/credentials-rejected-error'
import { EmailAlreadyRegisteredError } from '~/domain/errors/email-already-registered-error'

const BASE_URL = 'http://localhost:8080'

/** 用真正的 FetchError 當替身：它連不上時照樣有 response 屬性，只是值為 undefined。 */
function buildFetchError(failure: { status?: number, message?: string }) {
  const context = failure.status === undefined
    ? { request: BASE_URL, options: {}, error: new Error('fetch failed') }
    : {
        request: BASE_URL,
        options: {},
        response: {
          status: failure.status,
          statusText: 'rejected',
          _data: failure.message === undefined ? undefined : { message: failure.message },
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

    const signedInUser = await new UserProxy(BASE_URL).registerUser('james@example.com', 'correct horse')

    expect(signedInUser.id).toBe(7)
    expect(signedInUser.email).toBe('james@example.com')
  })

  it('電子郵件被佔用是自己一種拒絕，不是一般的拒絕', async () => {
    // 畫面對它的反應不同：內容沒有錯，只是這個位址有人用了——
    // 兩格內容要留著，讓人改一個位址再送一次。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 409, message: '電子郵件「james@example.com」已經有人用了' })))

    await expect(new UserProxy(BASE_URL).registerUser('james@example.com', 'correct horse'))
      .rejects.toBeInstanceOf(EmailAlreadyRegisteredError)
  })

  it('其餘的拒絕維持一般的拒絕', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 400, message: '密碼至少要 8 個字元' })))

    const failure = await new UserProxy(BASE_URL)
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

    const session = await new UserProxy(BASE_URL).signIn('james@example.com', 'correct horse')

    expect(session.accessToken).toBe('a-signed-token')
    expect(session.accessTokenExpiresAt.toISOString()).toBe('2026-09-05T08:15:00.000Z')
    expect(session.refreshToken).toBe('a-refresh-token')
    expect(session.refreshTokenExpiresAt.toISOString()).toBe('2026-10-05T08:00:00.000Z')
  })

  it('帳密對不上是自己一種拒絕，訊息原文轉達', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 401, message: '電子郵件或密碼不正確' })))

    const failure = await new UserProxy(BASE_URL)
      .signIn('james@example.com', 'wrong horse').catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(CredentialsRejectedError)
    expect((failure as Error).message).toBe('電子郵件或密碼不正確')
  })

  it('後端簽不出憑證是另外一種——使用者改什麼都沒用', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 503, message: '尚未設定憑證簽章鑰匙' })))

    const failure = await new UserProxy(BASE_URL)
      .signIn('james@example.com', 'correct horse').catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(AccessTokenUnavailableError)
    expect(failure).not.toBeInstanceOf(CredentialsRejectedError)
  })

  it('後端沒啟動仍然是連不上，不會被當成帳密不正確', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({})))

    await expect(new UserProxy(BASE_URL).signIn('james@example.com', 'correct horse'))
      .rejects.toBeInstanceOf(BackendUnreachableError)
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

    await expect(new UserProxy(BASE_URL).signIn('james@example.com', 'correct horse'))
      .rejects.toBeInstanceOf(BackendRequestRejectedError)
  })
})

describe('UserProxy.renewSession', () => {
  it('帶著續用憑證去換，並把換回來的一對收乾淨', async () => {
    const fetchStub = vi.fn().mockResolvedValue(sessionWire())
    vi.stubGlobal('$fetch', fetchStub)

    const session = await new UserProxy(BASE_URL).renewSession('an-older-token')

    expect(fetchStub).toHaveBeenCalledWith(
      `${BASE_URL}/sessions/renewal`,
      expect.objectContaining({ method: 'POST', body: { refreshToken: 'an-older-token' } }),
    )
    expect(session.refreshToken).toBe('a-refresh-token')
  })

  it('換發被拒絕與憑證不算數是同一種——分成兩種只會逼每個呼叫端寫兩次同樣的處理', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 401, message: '請重新登入' })))

    const failure = await new UserProxy(BASE_URL)
      .renewSession('a-stale-token').catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(AuthenticationRequiredError)
    expect(failure).not.toBeInstanceOf(CredentialsRejectedError)
  })

  it('後端簽不出憑證時說的是那件事，不是憑證不算數', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 503, message: '尚未設定憑證簽章鑰匙' })))

    const failure = await new UserProxy(BASE_URL)
      .renewSession('a-refresh-token').catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(AccessTokenUnavailableError)
  })

  it('後端沒啟動仍然是連不上——那不代表這份續用憑證壞了', async () => {
    // 說錯的代價很具體：後端一啟動，使用者就得重登一次。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({})))

    const failure = await new UserProxy(BASE_URL)
      .renewSession('a-refresh-token').catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(BackendUnreachableError)
    expect(failure).not.toBeInstanceOf(AuthenticationRequiredError)
  })
})

describe('UserProxy.revokeSession', () => {
  it('請後端撤掉這台裝置的登入階段', async () => {
    const fetchStub = vi.fn().mockResolvedValue(null)
    vi.stubGlobal('$fetch', fetchStub)

    await new UserProxy(BASE_URL).revokeSession('a-refresh-token')

    expect(fetchStub).toHaveBeenCalledWith(
      `${BASE_URL}/sessions/revocation`,
      expect.objectContaining({ method: 'POST', body: { refreshToken: 'a-refresh-token' } }),
    )
  })

  it('後端連不上時如實拋出——要不要吞掉是呼叫端的決定，不是這一層的', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({})))

    await expect(new UserProxy(BASE_URL).revokeSession('a-refresh-token'))
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })
})

describe('UserProxy.fetchSignedInUser', () => {
  it('帶著憑證去問，並把答案收成領域看得懂的形狀', async () => {
    const fetchStub = vi.fn().mockResolvedValue({ id: 7, email: 'james@example.com' })
    vi.stubGlobal('$fetch', fetchStub)

    const signedInUser = await new UserProxy(BASE_URL).fetchSignedInUser('a-signed-token')

    expect(fetchStub).toHaveBeenCalledWith(
      `${BASE_URL}/users/me`,
      expect.objectContaining({ headers: { Authorization: 'Bearer a-signed-token' } }),
    )
    expect(signedInUser.email).toBe('james@example.com')
  })

  it('憑證不算數時說的是「當作沒登入」，不是一般的拒絕', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 401, message: '請重新登入' })))

    await expect(new UserProxy(BASE_URL).fetchSignedInUser('a-stale-token'))
      .rejects.toBeInstanceOf(AuthenticationRequiredError)
  })

  it('連不上後端不代表這份憑證壞了', async () => {
    // 這個差別是有代價的：說成憑證壞了，後端一啟動使用者就得重登一次。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({})))

    const failure = await new UserProxy(BASE_URL)
      .fetchSignedInUser('a-signed-token').catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(BackendUnreachableError)
    expect(failure).not.toBeInstanceOf(AuthenticationRequiredError)
  })
})
