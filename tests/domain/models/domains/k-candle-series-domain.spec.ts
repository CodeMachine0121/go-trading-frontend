import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { KCandleSeriesDomain } from '~/domain/models/domains/k-candle-series-domain'
import { KCandle } from '~/domain/models/entities/k-candle'
import { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import { seriesOf } from '../../../fixtures/k-candle-series'
import {
  AUTOMATIC_AGGREGATION_INTERVAL_CHOICE, aggregationIntervalChoiceOf,
} from '../../../fixtures/aggregation-interval-choice'
import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'

const COVERED_START_TIME = new Date('2026-09-02T06:00:00.000Z')
const COVERED_END_TIME = new Date('2026-09-02T18:00:00.000Z')

/** 取回計畫說要哪一段、以及使用者挑了什麼——它說不出**實際**多粗，那是系統回答的。 */
function loadPlanForThatStretch(
  choice: AggregationIntervalChoiceDto = AUTOMATIC_AGGREGATION_INTERVAL_CHOICE,
): KCandleChartLoadPlanVo {
  return new KCandleChartLoadPlanVo(
    true,
    'BTCUSDT',
    new Date('2026-09-02T08:00:00.000Z'),
    new Date('2026-09-02T16:00:00.000Z'),
    COVERED_START_TIME,
    COVERED_END_TIME,
    choice,
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

  it('記下這一批是以哪個選擇取回的——下一次比對「換粗細了沒」拿它來比', () => {
    const chart = new KCandleSeriesDomain(
      seriesOf([], '15m'), loadPlanForThatStretch(aggregationIntervalChoiceOf('5m'))).toDto()

    // 兩個關於粗細的東西並存且不同：挑的是五分鐘，系統實際用了十五分鐘。
    // 拿後端回報的那個去比對會無限重取——挑「自動」時它永遠不等於「自動」。
    expect(chart.aggregationIntervalChoice.value).toBe('5m')
    expect(chart.interval.value).toBe('15m')
  })

  it('沒挑時記下的就是「沒挑」，不是系統替我們挑的那一種', () => {
    const chart = new KCandleSeriesDomain(seriesOf([], '1h'), loadPlanForThatStretch()).toDto()

    expect(chart.aggregationIntervalChoice.value).toBe('auto')
    expect(chart.aggregationIntervalChoice.declaredInterval).toBeNull()
    expect(chart.interval.value).toBe('1h')
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
