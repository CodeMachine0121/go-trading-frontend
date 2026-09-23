import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { BacktestTradeStatistics } from '~/domain/models/entities/backtest'
import { BacktestTradeStatisticsDomain } from '~/domain/models/domains/backtest-trade-statistics-domain'

describe('BacktestTradeStatisticsDomain', () => {
  it('五格都有值時照成績單的寫法寫出來', () => {
    const statistics = new BacktestTradeStatisticsDomain(new BacktestTradeStatistics(
      2.5, new Decimal(75), 9000, 1, 0.25)).toDto()

    expect(statistics.profitFactor).toBe('2.50')
    expect(statistics.expectancy).toBe('75.00')
    expect(statistics.averageHoldingTime).toBe('2 小時 30 分')
    expect(statistics.maximumConsecutiveLossCount).toBe('1 筆')
    expect(statistics.costToGrossProfitRatio).toBe('25.00%')
  })

  it('不適用的四格寫「不適用」，連虧零筆照寫', () => {
    const statistics = new BacktestTradeStatisticsDomain(
      new BacktestTradeStatistics(null, null, null, 0, null)).toDto()

    expect(statistics.profitFactor).toBe('不適用')
    expect(statistics.expectancy).toBe('不適用')
    expect(statistics.averageHoldingTime).toBe('不適用')
    expect(statistics.costToGrossProfitRatio).toBe('不適用')
    expect(statistics.maximumConsecutiveLossCount).toBe('0 筆')
  })

  it.each([
    [45, '45 秒'],
    [273600, '3 天 4 小時'],
    [3600, '1 小時'],
    [90, '1 分 30 秒'],
    [0, '0 秒'],
  ])('平均持倉 %d 秒寫成「%s」', (averageHoldingSeconds, expected) => {
    const statistics = new BacktestTradeStatisticsDomain(new BacktestTradeStatistics(
      null, null, averageHoldingSeconds, 0, null)).toDto()

    expect(statistics.averageHoldingTime).toBe(expected)
  })
})
