import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { KCandle } from '~/domain/models/entities/k-candle'

const OPEN_TIME = new Date('2026-08-30T10:00:00.000Z')

function buildKCandle(open: string, close: string): KCandle {
  return new KCandle(
    'BTCUSDT',
    OPEN_TIME,
    new Decimal(open),
    new Decimal('120'),
    new Decimal('90'),
    new Decimal(close),
    new Decimal('11'),
    new Decimal('1200'),
    new Decimal('5'),
    new Decimal('600'),
  )
}

describe('KCandleDomain', () => {
  it.each([
    { open: '100', close: '110', expectedValue: 'up', expectedLabel: '上漲', expectedTone: 'success' },
    { open: '100', close: '90', expectedValue: 'down', expectedLabel: '下跌', expectedTone: 'danger' },
    { open: '100', close: '100', expectedValue: 'flat', expectedLabel: '持平', expectedTone: 'neutral' },
  ])('開盤 $open、收盤 $close 的漲跌為 $expectedValue', ({ open, close, expectedValue, expectedLabel, expectedTone }) => {
    const trend = buildKCandle(open, close).toDomain().trend()

    expect(trend.value).toBe(expectedValue)
    expect(trend.label).toBe(expectedLabel)
    expect(trend.tone).toBe(expectedTone)
  })

  it.each([
    { open: '100', close: '110.5', expectedPriceChange: '10.5' },
    { open: '100', close: '90', expectedPriceChange: '-10' },
    { open: '0.1', close: '0.3', expectedPriceChange: '0.2' },
  ])('開盤 $open、收盤 $close 的漲跌幅為 $expectedPriceChange', ({ open, close, expectedPriceChange }) => {
    expect(buildKCandle(open, close).toDomain().priceChange().toString()).toBe(expectedPriceChange)
  })

  it('轉成 DTO 時帶著原本的價量數字與算好的漲跌', () => {
    const kCandleDto = buildKCandle('100', '110').toDomain().toDto()

    expect(kCandleDto.symbol).toBe('BTCUSDT')
    expect(kCandleDto.openTime).toEqual(OPEN_TIME)
    expect(kCandleDto.open.toString()).toBe('100')
    expect(kCandleDto.high.toString()).toBe('120')
    expect(kCandleDto.low.toString()).toBe('90')
    expect(kCandleDto.close.toString()).toBe('110')
    expect(kCandleDto.volume.toString()).toBe('11')
    expect(kCandleDto.quoteVolume.toString()).toBe('1200')
    expect(kCandleDto.takerBuyBaseVolume.toString()).toBe('5')
    expect(kCandleDto.takerBuyQuoteVolume.toString()).toBe('600')
    expect(kCandleDto.trend.value).toBe('up')
  })
})
