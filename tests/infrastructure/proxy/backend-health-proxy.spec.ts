import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BackendHealthProxy } from '~/infrastructure/proxy/backend-health-proxy'
import { signedInSessionStorage, signedOutSessionStorage, SIGNED_IN_HEADERS } from '../../fixtures/session-storage'
import { Session } from '~/domain/models/entities/session'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { SignedOutError } from '~/domain/errors/signed-out-error'

const BASE_URL = 'http://localhost:8080'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BackendHealthProxy', () => {
  it('問後端的健康狀態並帶回檢查時間', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 'Healthy' })
    vi.stubGlobal('$fetch', fetchMock)

    const backendHealth = await new BackendHealthProxy(BASE_URL, signedInSessionStorage()).fetchBackendHealth()

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/health', { headers: SIGNED_IN_HEADERS })
    expect(backendHealth.status).toBe('Healthy')
    expect(backendHealth.checkedAt).toBeInstanceOf(Date)
  })

  it('連不上時包成連線錯誤', async () => {
    // 後端沒啟動時實際拿到的錯誤：帶著 response 屬性但值為 undefined。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(createFetchError({
      request: 'http://localhost:8080/health',
      options: {},
      error: new Error('fetch failed'),
    } as unknown as FetchContext)))

    await expect(new BackendHealthProxy(BASE_URL, signedInSessionStorage()).fetchBackendHealth())
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })

  it('後端自己壞掉時包成「後端出錯」，而不是說請求有問題', async () => {
    const rejection = createFetchError({
      request: 'http://localhost:8080/health',
      options: {},
      response: { status: 503, statusText: 'Service Unavailable', _data: { message: '資料庫連線失敗' } },
    } as unknown as FetchContext)
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection))

    const fetchBackendHealth = new BackendHealthProxy(BASE_URL, signedInSessionStorage()).fetchBackendHealth()

    await expect(fetchBackendHealth).rejects.toBeInstanceOf(BackendServerError)
    await expect(new BackendHealthProxy(BASE_URL, signedInSessionStorage()).fetchBackendHealth())
      .rejects.toThrow('資料庫連線失敗')
  })

  it('後端以業務規則拒絕時才包成可轉達的拒絕', async () => {
    const rejection = createFetchError({
      request: 'http://localhost:8080/health',
      options: {},
      response: { status: 400, statusText: 'Bad Request', _data: { message: '參數不正確' } },
    } as unknown as FetchContext)
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection))

    await expect(new BackendHealthProxy(BASE_URL, signedInSessionStorage()).fetchBackendHealth())
      .rejects.toBeInstanceOf(BackendRequestRejectedError)
  })
})

describe('BackendApiProxy：身分是每一發的事', () => {
  // 這幾則掛在健康檢查上，因為它是最沒有自己意見的那一條路——測到的因此是**所有 proxy
  // 共用的那一段**，不是某一條路自己的行為。
  it('記著一段登入時，每一發都帶著它', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 'Healthy' })
    vi.stubGlobal('$fetch', fetchMock)

    await new BackendHealthProxy(BASE_URL, signedInSessionStorage()).fetchBackendHealth()

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/health', { headers: { Authorization: 'Bearer a-proof' } })
  })

  it('什麼都沒記著時什麼都不帶——那與帶一個空的憑證不是同一件事', async () => {
    // 開放的那幾條路照樣答得出來；需要身分的那幾條會被拒絕，而那正是我們要的。
    const fetchMock = vi.fn().mockResolvedValue({ status: 'Healthy' })
    vi.stubGlobal('$fetch', fetchMock)

    await new BackendHealthProxy(BASE_URL, signedOutSessionStorage()).fetchBackendHealth()

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/health', { headers: {} })
  })

  it('被回「沒有帶著有效的身分」時，清掉記著的那一份並說出去', async () => {
    const sessionStorageProxy = signedInSessionStorage()
    const onSignedOut = vi.fn()
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildSignedOutError()))

    const failure = await new BackendHealthProxy(BASE_URL, sessionStorageProxy, onSignedOut)
      .fetchBackendHealth().catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(SignedOutError)
    expect((failure as Error).message).toBe('請重新登入')
    expect(sessionStorageProxy.clearSession).toHaveBeenCalledOnce()
    expect(onSignedOut).toHaveBeenCalledOnce()
  })

  it('被擋下來時先試著救回這一段，救回來就把那一發再送一次', async () => {
    // 登入憑證只活十五分鐘，續用憑證活三十天。少了這一步，坐在圖表前十六分鐘之後
    // 按一下計算就會被踢回登入畫面——而系統自己修得好。
    const sessionStorageProxy = signedInSessionStorage()
    const onSignedOut = vi.fn()
    const recoverSession = vi.fn().mockResolvedValue(true)
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(buildSignedOutError())
      .mockResolvedValueOnce({ status: 'Healthy' })
    vi.stubGlobal('$fetch', fetchMock)

    const backendHealth = await new BackendHealthProxy(
      BASE_URL, sessionStorageProxy, onSignedOut, recoverSession).fetchBackendHealth()

    expect(backendHealth.status).toBe('Healthy')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(recoverSession).toHaveBeenCalledOnce()
    // 沒有被登出，也沒有清掉記著的那一份：這一發本來只是過期。
    expect(onSignedOut).not.toHaveBeenCalled()
    expect(sessionStorageProxy.clearSession).not.toHaveBeenCalled()
  })

  it('再送那一次帶的是新換到的憑證，不是剛剛被擋下來的那一份', async () => {
    // 換完之後身分是從記著的那一份重新讀的，所以「換到新的」與「送出新的」是同一件事。
    const sessionStorageProxy = signedInSessionStorage()
    vi.mocked(sessionStorageProxy.readSession)
      .mockImplementationOnce(() => new Session(
        'an-expired-proof',
        new Date('2026-09-10T09:00:00Z'),
        'a-refresh-token',
        new Date('2026-10-10T09:00:00Z')))
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(buildSignedOutError())
      .mockResolvedValueOnce({ status: 'Healthy' })
    vi.stubGlobal('$fetch', fetchMock)

    await new BackendHealthProxy(
      BASE_URL, sessionStorageProxy, vi.fn(), vi.fn().mockResolvedValue(true)).fetchBackendHealth()

    expect(fetchMock.mock.calls[0]?.[1]).toEqual({ headers: { Authorization: 'Bearer an-expired-proof' } })
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({ headers: SIGNED_IN_HEADERS })
  })

  it('救不回來才把人趕回登入畫面', async () => {
    const sessionStorageProxy = signedInSessionStorage()
    const onSignedOut = vi.fn()
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildSignedOutError()))

    const failure = await new BackendHealthProxy(
      BASE_URL, sessionStorageProxy, onSignedOut, vi.fn().mockResolvedValue(false))
      .fetchBackendHealth().catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(SignedOutError)
    expect(sessionStorageProxy.clearSession).toHaveBeenCalledOnce()
    expect(onSignedOut).toHaveBeenCalledOnce()
  })

  it('最多再試一次——換到的新憑證又被擋下來，就不再換第二次', async () => {
    // 續用憑證用過就失效，一直重試會踩到後端的盜用偵測，把「這一台要重登」
    // 升級成「這個人每一台都被登出」。界線寫在結構裡，不在一個可以調的數字裡。
    const recoverSession = vi.fn().mockResolvedValue(true)
    const fetchMock = vi.fn().mockRejectedValue(buildSignedOutError())
    vi.stubGlobal('$fetch', fetchMock)

    const failure = await new BackendHealthProxy(
      BASE_URL, signedInSessionStorage(), vi.fn(), recoverSession)
      .fetchBackendHealth().catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(SignedOutError)
    expect(recoverSession).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('那一種失敗不是「請求有問題」——把它混在一起，人會去修一份從來沒錯的請求', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildSignedOutError()))

    const failure = await new BackendHealthProxy(BASE_URL, signedInSessionStorage())
      .fetchBackendHealth().catch((error: unknown) => error)

    expect(failure).not.toBeInstanceOf(BackendRequestRejectedError)
    expect(failure).not.toBeInstanceOf(BackendServerError)
  })
})

function buildSignedOutError() {
  return createFetchError({
    request: `${BASE_URL}/health`,
    options: {},
    response: { status: 401, statusText: '', _data: { message: '請重新登入' } },
  } as unknown as FetchContext)
}
