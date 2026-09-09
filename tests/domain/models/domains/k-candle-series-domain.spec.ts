import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { KCandleSeriesDomain } from '~/domain/models/domains/k-candle-series-domain'
import { KCandle } from '~/domain/models/entities/k-candle'
import { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import { seriesOf } from '../../../fixtures/k-candle-series'

const COVERED_START_TIME = new Date('2026-09-02T06:00:00.000Z')
const COVERED_END_TIME = new Date('2026-09-02T18:00:00.000Z')

/** 取回計畫只說要哪一段——它說不出要多粗，那是系統回答的。 */
function loadPlanForThatStretch(): KCandleChartLoadPlanVo {
  return new KCandleChartLoadPlanVo(
    true,
    'BTCUSDT',
    new Date('2026-09-02T08:00:00.000Z'),
    new Date('2026-09-02T16:00:00.000Z'),
    COVERED_START_TIME,
    COVERED_END_TIME,
  )
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
    const chart = new KCandleSeriesDomain(seriesOf([
      kCandle('2026-09-02T10:00:00.000Z', '100', '110'),
      kCandle('2026-09-02T11:00:00.000Z', '100', '90'),
      kCandle('2026-09-02T12:00:00.000Z', '100', '100'),
    ], '1h'), loadPlanForThatStretch()).toDto()

    expect(chart.kCandles.map(candle => candle.trend.value)).toEqual(['up', 'down', 'flat'])
    expect(chart.count).toBe(3)
    expect(chart.isEmpty).toBe(false)
  })

  it('記下這批涵蓋的範圍——那是這次要求的那一段，不在回覆裡', () => {
    const chart = new KCandleSeriesDomain(seriesOf([], '1h'), loadPlanForThatStretch()).toDto()

    expect(chart.coveredStartTime).toEqual(COVERED_START_TIME)
    expect(chart.coveredEndTime).toEqual(COVERED_END_TIME)
  })

  it('取回一根都沒有時是空的一批，不是錯誤', () => {
    const chart = new KCandleSeriesDomain(seriesOf([], '1h'), loadPlanForThatStretch()).toDto()

    expect(chart.isEmpty).toBe(true)
    expect(chart.count).toBe(0)
    expect(chart.symbol).toBe('BTCUSDT')
  })

  it('交易標的取自這次的取回計畫——下一次要不要重新取就是拿它來比', () => {
    const chart = new KCandleSeriesDomain(seriesOf([], '4h'), loadPlanForThatStretch()).toDto()

    expect(chart.symbol).toBe('BTCUSDT')
  })

  it('每根涵蓋多久取自系統的回覆，不是我們要求的——我們什麼都沒要求', () => {
    const chart = new KCandleSeriesDomain(seriesOf([], '4h'), loadPlanForThatStretch()).toDto()

    expect(chart.interval.value).toBe('4h')
    expect(chart.interval.label).toBe('四小時')
  })

  it('系統回報一個認不得的刻度時退回最細的那一種，不讓畫面壞掉', () => {
    const chart = new KCandleSeriesDomain(seriesOf([], '7m'), loadPlanForThatStretch()).toDto()

    expect(chart.interval.value).toBe('1m')
    expect(chart.interval.label).toBe('一分鐘')
  })
})
