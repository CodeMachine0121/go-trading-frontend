import { describe, expect, it } from 'vitest'
import { KCandleQueryDomain } from '~/domain/models/domains/k-candle-query-domain'
import { KCandleQueryDto } from '~/domain/models/dto/k-candle-query-dto'
import { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'

const START_TIME = new Date('2026-08-30T10:00:00.000Z')
const EARLIER_TIME = new Date('2026-08-30T09:00:00.000Z')

describe('KCandleQueryDomain', () => {
  it.each([
    { description: '完全沒填', symbol: '' },
    { description: '只填了空白字元', symbol: '   ' },
  ])('交易標的 $description 時拒絕建立查詢條件', ({ symbol }) => {
    const buildQuery = () => new KCandleQueryDomain(new KCandleQueryDto(symbol, START_TIME, START_TIME))

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

  it('結束時間早於開始時間時拒絕建立查詢條件', () => {
    const buildQuery = () => new KCandleQueryDomain(
      new KCandleQueryDto('BTCUSDT', START_TIME, EARLIER_TIME),
    )

    expect(buildQuery).toThrow('結束時間不得早於開始時間')
    try {
      buildQuery()
    }
    catch (error: unknown) {
      expect((error as KCandleQueryValidationError).field).toBe('endTime')
    }
  })

  it('開始時間與結束時間相同視為合法', () => {
    const kCandleQueryDomain = new KCandleQueryDomain(
      new KCandleQueryDto('BTCUSDT', START_TIME, START_TIME),
    )

    expect(kCandleQueryDomain.startTime).toEqual(START_TIME)
    expect(kCandleQueryDomain.endTime).toEqual(START_TIME)
  })

  it('交易標的前後的空白會被去掉', () => {
    const kCandleQueryDomain = new KCandleQueryDomain(
      new KCandleQueryDto('  BTCUSDT  ', START_TIME, START_TIME),
    )

    expect(kCandleQueryDomain.symbol).toBe('BTCUSDT')
  })
})
