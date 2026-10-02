import { describe, expect, it } from 'vitest'
import { BinanceTradingKey } from '~/domain/models/entities/binance-trading-key'

const CONFIGURED_AT = new Date('2026-10-01T08:00:00Z')

describe('BinanceTradingKeyDomain.toDto', () => {
  it.each([
    { tradableMarkets: ['spot'], expectedLabel: '現貨', expectedEnglishLabel: 'Spot' },
    { tradableMarkets: ['contract'], expectedLabel: '合約', expectedEnglishLabel: 'Contract' },
    { tradableMarkets: ['spot', 'contract'], expectedLabel: '現貨、合約', expectedEnglishLabel: 'Spot, Contract' },
    { tradableMarkets: ['contract', 'spot'], expectedLabel: '現貨、合約', expectedEnglishLabel: 'Spot, Contract' },
    { tradableMarkets: ['margin', 'spot'], expectedLabel: '現貨', expectedEnglishLabel: 'Spot' },
  ])('可交易市場 $tradableMarkets 讀作「$expectedLabel」（$expectedEnglishLabel）', (
    { tradableMarkets, expectedLabel, expectedEnglishLabel },
  ) => {
    const binanceTradingKey = new BinanceTradingKey(true, 'a1b2', tradableMarkets, CONFIGURED_AT)
    const label = binanceTradingKey.toDomain().toDto().tradableMarketsLabel

    expect(label.in('zh-TW')).toBe(expectedLabel)
    expect(label.in('en')).toBe(expectedEnglishLabel)
  })

  it.each([
    { apiKeyTail: 'a1b2', expectedSummary: '結尾 a1b2', expectedEnglishSummary: 'Ending in a1b2' },
    { apiKeyTail: '', expectedSummary: '已設定', expectedEnglishSummary: 'Configured' },
  ])('API Key 結尾「$apiKeyTail」說成「$expectedSummary」（$expectedEnglishSummary）', (
    { apiKeyTail, expectedSummary, expectedEnglishSummary },
  ) => {
    const binanceTradingKey = new BinanceTradingKey(true, apiKeyTail, ['spot'], CONFIGURED_AT)
    const summary = binanceTradingKey.toDomain().toDto().apiKeySummary

    expect(summary?.in('zh-TW')).toBe(expectedSummary)
    expect(summary?.in('en')).toBe(expectedEnglishSummary)
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

    const dto = binanceTradingKey.toDomain().toDto()

    expect(dto).toEqual(expect.objectContaining({
      configured: false,
      apiKeySummary: null,
      configuredAt: null,
    }))
    expect(dto.tradableMarketsLabel.in('zh-TW')).toBe('')
    expect(dto.tradableMarketsLabel.in('en')).toBe('')
  })
})
