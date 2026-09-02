import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { KCandleSeries } from '~/domain/models/entities/k-candle-series'
import { KCandle } from '~/domain/models/entities/k-candle'
import { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import { AGGREGATION_INTERVALS } from '~/domain/models/vo/aggregation-interval-vo'

const COVERED_START_TIME = new Date('2026-09-02T06:00:00.000Z')
const COVERED_END_TIME = new Date('2026-09-02T18:00:00.000Z')

function intervalFor(value: string) {
  const aggregationInterval = AGGREGATION_INTERVALS.find(candidate => candidate.value === value)
  if (aggregationInterval === undefined) {
    throw new Error(`測試用了一個不存在的彙總刻度：${value}`)
  }
  return aggregationInterval
}

function loadPlanAskingFor(intervalValue: string): KCandleChartLoadPlanVo {
  return new KCandleChartLoadPlanVo(
    true, 'BTCUSDT', intervalFor(intervalValue), COVERED_START_TIME, COVERED_END_TIME)
}

/** 只給會影響漲跌的兩個數字，其餘填成不會被誤認的值。 */
function kCandle(openTime: string, open: string, closePrice: string): KCandle {
  return new KCandle(
    'BTCUSDT', new Date(openTime),
    new Decimal(open), new Decimal('999'), new Decimal('1'), new Decimal(closePrice),
    new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'),
  )
}

describe('KCandleSeriesDomain', () => {
  it('把取回的每一根都算好漲跌交給畫面', () => {
    const chart = new KCandleSeries('BTCUSDT', '1h', [
      kCandle('2026-09-02T10:00:00.000Z', '100', '110'),
      kCandle('2026-09-02T11:00:00.000Z', '100', '90'),
      kCandle('2026-09-02T12:00:00.000Z', '100', '100'),
    ]).toDomain(loadPlanAskingFor('1h')).toDto()

    expect(chart.kCandles.map(candle => candle.trend.value)).toEqual(['up', 'down', 'flat'])
    expect(chart.count).toBe(3)
    expect(chart.isEmpty).toBe(false)
  })

  it('記下這批涵蓋的範圍——那是這次要求的那一段，不在回覆裡', () => {
    const chart = new KCandleSeries('BTCUSDT', '1h', [])
      .toDomain(loadPlanAskingFor('1h')).toDto()

    expect(chart.coveredStartTime).toEqual(COVERED_START_TIME)
    expect(chart.coveredEndTime).toEqual(COVERED_END_TIME)
  })

  it('取回一根都沒有時是空的一批，不是錯誤', () => {
    const chart = new KCandleSeries('BTCUSDT', '1h', [])
      .toDomain(loadPlanAskingFor('1h')).toDto()

    expect(chart.isEmpty).toBe(true)
    expect(chart.count).toBe(0)
    expect(chart.symbol).toBe('BTCUSDT')
  })

  it('採用後端回報的彙總刻度，而不是這次要求的那一種', () => {
    const chart = new KCandleSeries('BTCUSDT', '4h', [])
      .toDomain(loadPlanAskingFor('1h')).toDto()

    expect(chart.interval.value).toBe('4h')
    expect(chart.interval.label).toBe('四小時')
  })

  it('後端回報了一個認不得的彙總刻度時，沿用這次要求的那一種', () => {
    const chart = new KCandleSeries('BTCUSDT', '7m', [])
      .toDomain(loadPlanAskingFor('1h')).toDto()

    expect(chart.interval.value).toBe('1h')
  })
})
