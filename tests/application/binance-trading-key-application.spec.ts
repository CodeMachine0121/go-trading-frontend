import { describe, expect, it, vi } from 'vitest'
import type { IBinanceTradingKeyProxy } from '~/domain/interface/i-binance-trading-key-proxy'
import { BinanceTradingKeyApplication } from '~/application/binance-trading-key-application'
import { BinanceTradingKeyService } from '~/domain/service/binance-trading-key-service'
import { BinanceTradingKey } from '~/domain/models/entities/binance-trading-key'
import { BinanceTradingKeyWriteDto } from '~/domain/models/dto/binance-trading-key-write-dto'
import { BinanceTradingKeyFieldError } from '~/domain/errors/binance-trading-key-field-error'

const SPOT_ONLY = new BinanceTradingKey(true, 'a1b2', ['spot'], new Date('2026-10-01T08:00:00Z'))
const UNCONFIGURED = new BinanceTradingKey(false, '', [], null)

function buildFixture() {
  const binanceTradingKeyProxy = {
    fetchTradingKey: vi.fn().mockResolvedValue(SPOT_ONLY),
    saveTradingKey: vi.fn().mockResolvedValue(SPOT_ONLY),
    removeTradingKey: vi.fn().mockResolvedValue(undefined),
  } satisfies IBinanceTradingKeyProxy

  return {
    application: new BinanceTradingKeyApplication(
      new BinanceTradingKeyService(binanceTradingKeyProxy)),
    binanceTradingKeyProxy,
  }
}

describe('BinanceTradingKeyApplication.loadTradingKey', () => {
  it('已設定時說得出結尾與可交易市場', async () => {
    const { application } = buildFixture()

    const setting = await application.loadTradingKey()

    expect(setting).toMatchObject({
      configured: true,
      apiKeySummary: '結尾 a1b2',
      tradableMarketsLabel: '現貨',
    })
  })

  it('還沒設定過不是錯誤', async () => {
    const { application, binanceTradingKeyProxy } = buildFixture()
    binanceTradingKeyProxy.fetchTradingKey.mockResolvedValue(UNCONFIGURED)

    await expect(application.loadTradingKey()).resolves.toMatchObject({ configured: false })
  })
})

describe('BinanceTradingKeyApplication.saveTradingKey', () => {
  it('兩格去掉前後空白後送出，回存好的那一份', async () => {
    const { application, binanceTradingKeyProxy } = buildFixture()

    const saved = await application.saveTradingKey(
      new BinanceTradingKeyWriteDto('  the-api-key\n', ' the-secret-key '))

    expect(binanceTradingKeyProxy.saveTradingKey).toHaveBeenCalledWith(
      new BinanceTradingKeyWriteDto('the-api-key', 'the-secret-key'))
    expect(saved.apiKeySummary).toBe('結尾 a1b2')
  })

  it.each([
    { apiKey: '', secretKey: 'the-secret-key', expectedField: 'apiKey', expectedMessage: '必須給 API Key' },
    { apiKey: 'the-api-key', secretKey: '   ', expectedField: 'secretKey', expectedMessage: '必須給 Secret Key' },
    { apiKey: ' ', secretKey: '', expectedField: 'apiKey', expectedMessage: '必須給 API Key' },
  ])('空白的那一格（$expectedField）被指出來，而且什麼都沒送出', async (
    { apiKey, secretKey, expectedField, expectedMessage }) => {
    const { application, binanceTradingKeyProxy } = buildFixture()

    const saving = application.saveTradingKey(new BinanceTradingKeyWriteDto(apiKey, secretKey))

    await expect(saving).rejects.toBeInstanceOf(BinanceTradingKeyFieldError)
    await expect(saving).rejects.toMatchObject({ field: expectedField, message: expectedMessage })
    expect(binanceTradingKeyProxy.saveTradingKey).not.toHaveBeenCalled()
  })
})

describe('BinanceTradingKeyApplication.removeTradingKey', () => {
  it('交給交易服務整份移除', async () => {
    const { application, binanceTradingKeyProxy } = buildFixture()

    await application.removeTradingKey()

    expect(binanceTradingKeyProxy.removeTradingKey).toHaveBeenCalledOnce()
  })
})
