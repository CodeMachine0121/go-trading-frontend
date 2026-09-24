import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { KCandleContractSeriesDomain } from '~/domain/models/domains/k-candle-contract-series-domain'
import { KCandleContract } from '~/domain/models/entities/k-candle-contract'
import { ContractPriceLineVo } from '~/domain/models/vo/contract-price-line-vo'
import { KCandleContractSeriesVo } from '~/domain/models/vo/k-candle-contract-series-vo'
import { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import { aggregationIntervalOf } from '~/domain/models/vo/aggregation-interval-vo'
import { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'

const LOAD_PLAN = new KCandleChartLoadPlanVo(
  true, 'BTCUSDT',
  new Date('2026-09-23T03:00:00.000Z'), new Date('2026-09-23T09:00:00.000Z'),
  new Date('2026-09-23T00:00:00.000Z'), new Date('2026-09-23T12:00:00.000Z'),
  new AggregationIntervalChoiceDto('自動', null),
)

function lineClosingAt(close: string | null): ContractPriceLineVo | null {
  return close === null
    ? null
    : new ContractPriceLineVo(new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal(close))
}

function kCandleContractAt(openTime: string, mark: string, index: string | null, premium: string | null) {
  return new KCandleContract(
    'BTCUSDT', new Date(openTime),
    new Decimal('100'), new Decimal('130'), new Decimal('90'), new Decimal('110'),
    new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'),
    3, lineClosingAt(mark)!, lineClosingAt(index), lineClosingAt(premium),
  )
}

function chartOf(kCandleContracts: KCandleContract[]) {
  return new KCandleContractSeriesDomain(
    new KCandleContractSeriesVo(kCandleContracts, aggregationIntervalOf('15m')), LOAD_PLAN).toDto()
}

describe('KCandleContractSeriesDomain 行情摘要的三條價格線', () => {
  it('取最新那一根的標記價格、指數價格與溢價指數，並說出是哪一根的', () => {
    const chart = chartOf([
      kCandleContractAt('2026-09-23T08:00:00Z', '90', '89', '0.002'),
      kCandleContractAt('2026-09-23T08:15:00Z', '100', '99', '0.001'),
    ])

    expect(chart.latestContractPrices?.markPrice.toString()).toBe('100')
    expect(chart.latestContractPrices?.indexPrice?.toString()).toBe('99')
    expect(chart.latestContractPrices?.premiumIndex?.toString()).toBe('0.001')
    expect(chart.latestContractPrices?.recordedAt).toEqual(new Date('2026-09-23T08:15:00Z'))
  })

  it('沒有記錄的那兩條是沒有值，不是零', () => {
    const chart = chartOf([kCandleContractAt('2026-09-23T08:15:00Z', '100', null, null)])

    expect(chart.latestContractPrices?.indexPrice).toBeNull()
    expect(chart.latestContractPrices?.premiumIndex).toBeNull()
  })

  it('一根都沒有時沒有三條價格線', () => {
    expect(chartOf([]).latestContractPrices).toBeNull()
  })

  it('K 線本身照舊交出來', () => {
    const chart = chartOf([kCandleContractAt('2026-09-23T08:15:00Z', '100', '99', '0.001')])

    expect(chart.symbol).toBe('BTCUSDT')
    expect(chart.count).toBe(1)
  })
})
