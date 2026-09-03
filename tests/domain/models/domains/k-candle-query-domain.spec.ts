import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KCandleQueryDomain } from '~/domain/models/domains/k-candle-query-domain'
import { KCandleQueryDto } from '~/domain/models/dto/k-candle-query-dto'
import { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'

const CURRENT_TIME = new Date('2026-08-30T12:00:00.000Z')
const START_TIME = new Date('2026-08-30T10:00:00.000Z')
const FUTURE_TIME = new Date('2026-08-30T12:01:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(CURRENT_TIME)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('KCandleQueryDomain', () => {
  it.each([
    { description: '完全沒填', symbol: '' },
    { description: '只填了空白字元', symbol: '   ' },
  ])('交易標的 $description 時拒絕建立查詢條件', ({ symbol }) => {
    const buildQuery = () => new KCandleQueryDomain(new KCandleQueryDto(symbol, START_TIME))

    expect(buildQuery).toThrow(KCandleQueryValidationError)
    expect(buildQuery).toThrow('請指定交易標的')
    try {
      buildQuery()
    }
    catch (error: unknown) {
      expect(error).toBeInstanceOf(KCandleQueryValidationError)
      expect((error as KCandleQueryValidationError).field).toBe('symbol')
    }
  })

  it('結束時間一律是目前時間，不由使用者指定', () => {
    const kCandleQueryDomain = new KCandleQueryDomain(new KCandleQueryDto('BTCUSDT', START_TIME))

    expect(kCandleQueryDomain.startTime).toEqual(START_TIME)
    expect(kCandleQueryDomain.endTime).toEqual(CURRENT_TIME)
  })

  it('開始時間晚於目前時間時拒絕建立查詢條件', () => {
    const buildQuery = () => new KCandleQueryDomain(new KCandleQueryDto('BTCUSDT', FUTURE_TIME))

    expect(buildQuery).toThrow('開始時間不得晚於目前時間')
    try {
      buildQuery()
    }
    catch (error: unknown) {
      expect((error as KCandleQueryValidationError).field).toBe('startTime')
    }
  })

  it('開始時間剛好是目前時間視為合法', () => {
    const kCandleQueryDomain = new KCandleQueryDomain(new KCandleQueryDto('BTCUSDT', CURRENT_TIME))

    expect(kCandleQueryDomain.startTime).toEqual(CURRENT_TIME)
    expect(kCandleQueryDomain.endTime).toEqual(CURRENT_TIME)
  })

  it('開始時間被清空時拒絕建立查詢條件', () => {
    const buildQuery = () => new KCandleQueryDomain(new KCandleQueryDto('BTCUSDT', new Date('')))

    expect(buildQuery).toThrow('請填寫開始時間')
    try {
      buildQuery()
    }
    catch (error: unknown) {
      expect((error as KCandleQueryValidationError).field).toBe('startTime')
    }
  })

  it('交易標的前後的空白會被去掉', () => {
    const kCandleQueryDomain = new KCandleQueryDomain(new KCandleQueryDto('  BTCUSDT  ', START_TIME))

    expect(kCandleQueryDomain.symbol).toBe('BTCUSDT')
  })
})
