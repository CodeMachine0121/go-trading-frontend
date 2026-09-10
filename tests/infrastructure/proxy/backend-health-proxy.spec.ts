import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BackendHealthProxy } from '~/infrastructure/proxy/backend-health-proxy'
import { signedInSessionStorage, signedOutSessionStorage, SIGNED_IN_HEADERS } from '../../fixtures/session-storage'
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
