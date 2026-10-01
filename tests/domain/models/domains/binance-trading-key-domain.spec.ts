import { describe, expect, it } from 'vitest'
import { BinanceTradingKey } from '~/domain/models/entities/binance-trading-key'

const CONFIGURED_AT = new Date('2026-10-01T08:00:00Z')

describe('BinanceTradingKeyDomain.toDto', () => {
  it.each([
    { tradableMarkets: ['spot'], expectedLabel: '現貨' },
    { tradableMarkets: ['contract'], expectedLabel: '合約' },
    { tradableMarkets: ['spot', 'contract'], expectedLabel: '現貨、合約' },
    { tradableMarkets: ['contract', 'spot'], expectedLabel: '現貨、合約' },
    { tradableMarkets: ['margin', 'spot'], expectedLabel: '現貨' },
  ])('可交易市場 $tradableMarkets 讀作「$expectedLabel」', ({ tradableMarkets, expectedLabel }) => {
    const binanceTradingKey = new BinanceTradingKey(true, 'a1b2', tradableMarkets, CONFIGURED_AT)

    expect(binanceTradingKey.toDomain().toDto().tradableMarketsLabel).toBe(expectedLabel)
  })

  it.each([
    { apiKeyTail: 'a1b2', expectedSummary: '結尾 a1b2' },
    { apiKeyTail: '', expectedSummary: '已設定' },
  ])('API Key 結尾「$apiKeyTail」說成「$expectedSummary」', ({ apiKeyTail, expectedSummary }) => {
    const binanceTradingKey = new BinanceTradingKey(true, apiKeyTail, ['spot'], CONFIGURED_AT)

    expect(binanceTradingKey.toDomain().toDto().apiKeySummary).toBe(expectedSummary)
  })

  it('已設定時帶著設定時刻', () => {
    const binanceTradingKey = new BinanceTradingKey(true, 'a1b2', ['spot'], CONFIGURED_AT)

    expect(binanceTradingKey.toDomain().toDto()).toMatchObject({
      configured: true,
      configuredAt: CONFIGURED_AT,
    })
  })

  it('未設定時沒有任何結尾、市場或時刻', () => {
    const binanceTradingKey = new BinanceTradingKey(false, '', [], null)

    expect(binanceTradingKey.toDomain().toDto()).toEqual(expect.objectContaining({
      configured: false,
      apiKeySummary: null,
      tradableMarketsLabel: '',
      configuredAt: null,
    }))
  })
})
