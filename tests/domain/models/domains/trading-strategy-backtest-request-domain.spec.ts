import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { TradingStrategyBacktestRequestDomain } from '~/domain/models/domains/trading-strategy-backtest-request-domain'
import { TradingStrategyBacktestRequestDto } from '~/domain/models/dto/trading-strategy-backtest-request-dto'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'

const START_TIME = new Date('2026-08-01T00:00:00Z')
const END_TIME = new Date('2026-08-31T00:00:00Z')

function aRequest(overrides: Partial<{
  tradingStrategyId: number
  symbol: string
  startTime: Date
  endTime: Date
  initialCapital: Decimal
  positionSizingMode: PositionSizingMode
  positionSizingValue: Decimal
  stopLossPercentage: Decimal
  takeProfitPercentage: Decimal
  entryCostPercentage: Decimal
  exitCostPercentage: Decimal
  leverage: Decimal
  maintenanceMarginRate: Decimal
}> = {}) {
  return new TradingStrategyBacktestRequestDto(
    overrides.tradingStrategyId ?? 7,
    overrides.symbol ?? 'BTCUSDT',
    overrides.startTime ?? START_TIME,
    overrides.endTime ?? END_TIME,
    overrides.initialCapital ?? new Decimal('10000'),
    overrides.positionSizingMode ?? 'allIn',
    overrides.positionSizingValue ?? new Decimal('50'),
    // 留白的那一次不模擬任何出場，也就是這一刀之前的每一次。
    overrides.stopLossPercentage ?? new Decimal(0),
    overrides.takeProfitPercentage ?? new Decimal(0),
    // 留白的那一次不收任何費用，也就是這一刀之前的每一次。
    overrides.entryCostPercentage ?? new Decimal(0),
    overrides.exitCostPercentage ?? new Decimal(0),
  )
}

describe('TradingStrategyBacktestRequestDomain', () => {
  it('每一格都填對就建得起來', () => {
    const requestDomain = new TradingStrategyBacktestRequestDomain(aRequest())

    expect(requestDomain.tradingStrategyId).toBe(7)
    expect(requestDomain.symbol).toBe('BTCUSDT')
  })

  // 送出去的東西裡沒有算式，也沒有彙總刻度：那兩樣是那份交易策略自己說的。
  // 這裡留一格給它們，畫面上就會有兩個答案而沒有規則說哪一個贏。
  it('沒有算式，也沒有彙總刻度', () => {
    const requestDomain = new TradingStrategyBacktestRequestDomain(aRequest())

    expect(Object.keys(requestDomain)).not.toContain('script')
    expect(Object.keys(requestDomain)).not.toContain('aggregationInterval')
  })

  it.each([
    ['還沒存過的那一份', { tradingStrategyId: 0 }, '請先存下這一份交易策略'],
    ['沒說要重演哪一檔', { symbol: '  ' }, '請指定交易標的'],
    ['本金是零', { initialCapital: new Decimal('0') }, '大於零'],
    ['本金不是一個數字', { initialCapital: new Decimal(Number.NaN) }, '大於零'],
  ])('%s就建不起來，並說出是哪一件事', (_situation, overrides, expectedMessage) => {
    expect(() => new TradingStrategyBacktestRequestDomain(aRequest(overrides)))
      .toThrowError(expect.objectContaining({ message: expect.stringContaining(expectedMessage) }))
  })

  it('起點晚於終點就建不起來，而且說得出是哪一對', () => {
    const buildIt = () => new TradingStrategyBacktestRequestDomain(
      aRequest({ startTime: END_TIME, endTime: START_TIME }))

    expect(buildIt).toThrowError(BacktestFieldError)
    // 落在哪一格才是重點：一則說不出去處的錯誤等於沒有說。
    expect(buildIt).toThrowError(expect.objectContaining({ field: 'timeRange' }))
  })

  it('市場前後的空白去掉——送出去的與比對的必須是同一個字', () => {
    const requestDomain = new TradingStrategyBacktestRequestDomain(
      aRequest({ symbol: '  BTCUSDT  ' }))

    expect(requestDomain.symbol).toBe('BTCUSDT')
  })
})
