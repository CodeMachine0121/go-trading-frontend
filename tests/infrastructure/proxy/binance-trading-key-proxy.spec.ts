import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BinanceTradingKeyProxy } from '~/infrastructure/proxy/binance-trading-key-proxy'
import { signedInSessionStorage } from '../../fixtures/session-storage'
import { BinanceTradingKeyWriteDto } from '~/domain/models/dto/binance-trading-key-write-dto'
import { BinanceTradingKeyFieldError } from '~/domain/errors/binance-trading-key-field-error'
import { BinanceTradingKeyVerificationError } from '~/domain/errors/binance-trading-key-verification-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { SecretSealUnavailableError } from '~/domain/errors/secret-seal-unavailable-error'

const BASE_URL = 'http://localhost:8080'

function buildFetchError(status: number, data: { message: string, failureReason?: string }) {
  return createFetchError({
    request: BASE_URL,
    options: {},
    response: { status, statusText: 'rejected', _data: data },
  } as unknown as FetchContext)
}

function proxy() {
  return new BinanceTradingKeyProxy(BASE_URL, signedInSessionStorage())
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BinanceTradingKeyProxy.fetchTradingKey', () => {
  it('把交易服務給的那一份收成領域看得懂的形狀', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      configured: true,
      apiKeyTail: 'a1b2',
      tradableMarkets: ['spot', 'contract'],
      configuredAt: '2026-10-01T08:00:00Z',
    }))

    const binanceTradingKey = await proxy().fetchTradingKey()

    expect(binanceTradingKey.configured).toBe(true)
    expect(binanceTradingKey.apiKeyTail).toBe('a1b2')
    expect(binanceTradingKey.tradableMarkets).toEqual(['spot', 'contract'])
    expect(binanceTradingKey.configuredAt).toEqual(new Date('2026-10-01T08:00:00Z'))
  })

  it('未設定時那個零值時刻不當成一個設定時刻', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      configured: false,
      apiKeyTail: '',
      tradableMarkets: [],
      configuredAt: '0001-01-01T00:00:00Z',
    }))

    const binanceTradingKey = await proxy().fetchTradingKey()

    expect(binanceTradingKey.configured).toBe(false)
    expect(binanceTradingKey.configuredAt).toBeNull()
  })
})

describe('BinanceTradingKeyProxy.fetchTradingKey：交易服務少給欄位', () => {
  it('沒給結尾與市場時當成空的', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ configured: true, tradableMarkets: null }))

    const binanceTradingKey = await proxy().fetchTradingKey()

    expect(binanceTradingKey.apiKeyTail).toBe('')
    expect(binanceTradingKey.tradableMarkets).toEqual([])
    expect(binanceTradingKey.configuredAt).toBeNull()
  })
})

describe('BinanceTradingKeyProxy.saveTradingKey', () => {
  it('用 PUT 送出兩格', async () => {
    const fetchStub = vi.fn().mockResolvedValue({
      configured: true, apiKeyTail: 'a1b2', tradableMarkets: ['spot'], configuredAt: '2026-10-01T08:00:00Z',
    })
    vi.stubGlobal('$fetch', fetchStub)

    await proxy().saveTradingKey(new BinanceTradingKeyWriteDto('the-api-key', 'the-secret-key'))

    expect(fetchStub).toHaveBeenCalledWith(
      `${BASE_URL}/users/me/binance-trading-key`,
      expect.objectContaining({
        method: 'PUT',
        body: { apiKey: 'the-api-key', secretKey: 'the-secret-key' },
      }))
  })

  it.each([
    { status: 422, failureReason: 'keyRejected', message: '幣安不接受這組金鑰，請確認 API Key 與 Secret Key 後重新填寫' },
    { status: 422, failureReason: 'noTradingPermission', message: '這組幣安交易金鑰沒有任何交易權限，請到幣安開啟現貨或合約交易權限' },
    { status: 502, failureReason: 'unreachable', message: '連不上幣安，請稍後再試' },
    { status: 504, failureReason: 'timedOut', message: '等幣安回答等太久，這次沒有存成，請稍後再試' },
  ])('幣安確認沒過（$failureReason）帶著原話與原因', async ({ status, failureReason, message }) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError(status, { message, failureReason })))

    const saving = proxy().saveTradingKey(new BinanceTradingKeyWriteDto('the-api-key', 'the-secret-key'))

    await expect(saving).rejects.toBeInstanceOf(BinanceTradingKeyVerificationError)
    await expect(saving).rejects.toMatchObject({ message, reason: failureReason })
  })

  it('系統目前存不了不是使用者填錯', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError(503, { message: '系統目前無法安全保存幣安交易金鑰' })))

    await expect(proxy().saveTradingKey(new BinanceTradingKeyWriteDto('the-api-key', 'the-secret-key')))
      .rejects.toBeInstanceOf(SecretSealUnavailableError)
  })

  it('沒帶原因的伺服器錯誤維持原樣', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError(502, { message: 'something else broke' })))

    await expect(proxy().saveTradingKey(new BinanceTradingKeyWriteDto('the-api-key', 'the-secret-key')))
      .rejects.toBeInstanceOf(BackendServerError)
  })

  it.each([
    { message: 'binance trading key validation failed: Secret Key 中間不能有空白或換行', expectedField: 'secretKey' },
    { message: 'binance trading key validation failed: API Key 中間不能有空白或換行', expectedField: 'apiKey' },
    { message: 'binance trading key validation failed: 必須給 API Key', expectedField: 'apiKey' },
    { message: 'invalid character in request body', expectedField: null },
  ])('欄位規則的拒絕照原話，並指出是哪一格（$expectedField）', async ({ message, expectedField }) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError(400, { message })))

    const saving = proxy().saveTradingKey(new BinanceTradingKeyWriteDto('the-api-key', 'the-secret-key'))

    await expect(saving).rejects.toBeInstanceOf(BinanceTradingKeyFieldError)
    await expect(saving).rejects.toMatchObject({ message, field: expectedField })
  })

  it('連不上交易服務維持連不上', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(createFetchError({
      request: BASE_URL, options: {}, error: new Error('fetch failed'),
    } as unknown as FetchContext)))

    await expect(proxy().saveTradingKey(new BinanceTradingKeyWriteDto('the-api-key', 'the-secret-key')))
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })
})

describe('BinanceTradingKeyProxy.removeTradingKey', () => {
  it('用 DELETE 整份移除', async () => {
    const fetchStub = vi.fn().mockResolvedValue(null)
    vi.stubGlobal('$fetch', fetchStub)

    await proxy().removeTradingKey()

    expect(fetchStub).toHaveBeenCalledWith(
      `${BASE_URL}/users/me/binance-trading-key`,
      expect.objectContaining({ method: 'DELETE' }))
  })
})
