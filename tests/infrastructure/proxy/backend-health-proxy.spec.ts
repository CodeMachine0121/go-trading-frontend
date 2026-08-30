import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BackendHealthProxy } from '~/infrastructure/proxy/backend-health-proxy'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'

const BASE_URL = 'http://localhost:8080'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BackendHealthProxy', () => {
  it('問後端的健康狀態並帶回檢查時間', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 'Healthy' })
    vi.stubGlobal('$fetch', fetchMock)

    const backendHealth = await new BackendHealthProxy(BASE_URL).fetchBackendHealth()

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/health', {})
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

    await expect(new BackendHealthProxy(BASE_URL).fetchBackendHealth())
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })

  it('後端自己壞掉時包成「後端出錯」，而不是說請求有問題', async () => {
    const rejection = createFetchError({
      request: 'http://localhost:8080/health',
      options: {},
      response: { status: 503, statusText: 'Service Unavailable', _data: { message: '資料庫連線失敗' } },
    } as unknown as FetchContext)
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection))

    const fetchBackendHealth = new BackendHealthProxy(BASE_URL).fetchBackendHealth()

    await expect(fetchBackendHealth).rejects.toBeInstanceOf(BackendServerError)
    await expect(new BackendHealthProxy(BASE_URL).fetchBackendHealth())
      .rejects.toThrow('資料庫連線失敗')
  })

  it('後端以業務規則拒絕時才包成可轉達的拒絕', async () => {
    const rejection = createFetchError({
      request: 'http://localhost:8080/health',
      options: {},
      response: { status: 400, statusText: 'Bad Request', _data: { message: '參數不正確' } },
    } as unknown as FetchContext)
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection))

    await expect(new BackendHealthProxy(BASE_URL).fetchBackendHealth())
      .rejects.toBeInstanceOf(BackendRequestRejectedError)
  })
})
