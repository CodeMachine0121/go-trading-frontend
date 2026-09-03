import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { LiveKCandleChartDomain } from '~/domain/models/domains/live-k-candle-chart-domain'
import { KCandle } from '~/domain/models/entities/k-candle'
import { LiveKCandleUpdate } from '~/domain/models/entities/live-k-candle-update'
import { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { AGGREGATION_INTERVALS } from '~/domain/models/vo/aggregation-interval-vo'

function intervalOf(value: string) {
  const interval = AGGREGATION_INTERVALS.find(candidate => candidate.value === value)
  if (interval === undefined) {
    throw new Error(`找不到彙總刻度 ${value}`)
  }

  return interval
}

function kCandleOf(
  openTime: string,
  figures: { high?: string, low?: string, close?: string, volume?: string } = {},
): KCandle {
  return new KCandle(
    'BTCUSDT',
    new Date(openTime),
    new Decimal('100'),
    new Decimal(figures.high ?? '120'),
    new Decimal(figures.low ?? '90'),
    new Decimal(figures.close ?? '110'),
    new Decimal(figures.volume ?? '0'),
    new Decimal('0'),
    new Decimal('0'),
    new Decimal('0'),
  )
}

function chartOf(interval: string, openTimes: string[]): KCandleChartDto {
  return new KCandleChartDto(
    'BTCUSDT',
    intervalOf(interval),
    new Date('2026-09-03T00:00:00.000Z'),
    new Date('2026-09-03T23:59:59.000Z'),
    openTimes.map(openTime => kCandleOf(openTime).toDomain().toDto()),
  )
}

function formingAt(openTime: string, figures: Parameters<typeof kCandleOf>[1] = {}) {
  return new LiveKCandleUpdate('BTCUSDT', 'forming', kCandleOf(openTime, figures))
}

describe('把即時更新併進圖上那批 K 線', () => {
  it('成交價變了，最後那一根的收盤價跟著變', () => {
    const chart = chartOf('5m', ['2026-09-03T10:00:00.000Z'])

    const merged = new LiveKCandleChartDomain(chart)
      .applying(formingAt('2026-09-03T10:00:00.000Z', { close: '118' }))
      .toChartDto()

    expect(merged.kCandles).toHaveLength(1)
    expect(merged.kCandles[0]?.close.toString()).toBe('118')
  })

  it('更高的成交價推高那一根的最高價', () => {
    const chart = chartOf('5m', ['2026-09-03T10:00:00.000Z'])

    const merged = new LiveKCandleChartDomain(chart)
      .applying(formingAt('2026-09-03T10:00:00.000Z', { high: '125' }))
      .toChartDto()

    expect(merged.kCandles[0]?.high.toString()).toBe('125')
  })

  it('較低的成交價不會拉低最高價', () => {
    // 那一根的最高價是它涵蓋的整段時間裡的最高，不是最後一筆。
    const chart = chartOf('5m', ['2026-09-03T10:00:00.000Z'])

    const merged = new LiveKCandleChartDomain(chart)
      .applying(formingAt('2026-09-03T10:00:00.000Z', { high: '115', low: '95', close: '115' }))
      .toChartDto()

    expect(merged.kCandles[0]?.high.toString()).toBe('120')
    expect(merged.kCandles[0]?.low.toString()).toBe('90')
    expect(merged.kCandles[0]?.close.toString()).toBe('115')
  })

  it('一根走完、下一根開始時，圖上多出一根新的', () => {
    const chart = chartOf('5m', ['2026-09-03T09:55:00.000Z'])

    const merged = new LiveKCandleChartDomain(chart)
      .applying(formingAt('2026-09-03T10:00:00.000Z', { close: '131' }))
      .toChartDto()

    expect(merged.kCandles.map(kCandle => kCandle.openTime.toISOString())).toEqual([
      '2026-09-03T09:55:00.000Z',
      '2026-09-03T10:00:00.000Z',
    ])
    expect(merged.kCandles[0]?.close.toString()).toBe('110')
  })

  it('同一根被反覆更新時，成交量不會被重複累加', () => {
    // 它持有的是「起始時間 → 那一根最新的樣子」，同一根再送一次是取代不是加上去。
    const chart = chartOf('5m', ['2026-09-03T09:55:00.000Z'])

    const merged = [1, 2, 3].reduce(
      live => live.applying(formingAt('2026-09-03T10:00:00.000Z', { volume: '12' })),
      new LiveKCandleChartDomain(chart)).toChartDto()

    const lastKCandle = merged.kCandles[merged.kCandles.length - 1]
    expect(lastKCandle?.volume.toString()).toBe('12')
  })

  it('不屬於這張圖的交易標的不採用', () => {
    const chart = chartOf('5m', ['2026-09-03T10:00:00.000Z'])

    const merged = new LiveKCandleChartDomain(chart)
      .applying(new LiveKCandleUpdate(
        'ETHUSDT', 'forming', kCandleOf('2026-09-03T10:00:00.000Z', { close: '999' })))
      .toChartDto()

    expect(merged.kCandles[0]?.close.toString()).toBe('110')
  })

  it('沒有 K 線可談的那一則原樣退回', () => {
    // 「即時已停止」要說的事不在這張圖上。
    const chart = chartOf('5m', ['2026-09-03T10:00:00.000Z'])

    const merged = new LiveKCandleChartDomain(chart)
      .applying(new LiveKCandleUpdate('BTCUSDT', 'stalled', null))
      .toChartDto()

    expect(merged).toBe(chart)
  })
})

describe('畫面看更粗的刻度時，五分鐘的變動要併進所屬的那一根', () => {
  it('併進所屬的那一小時，不自成一根', () => {
    const chart = chartOf('1h', ['2026-09-03T10:00:00.000Z'])

    const merged = new LiveKCandleChartDomain(chart)
      .applying(formingAt('2026-09-03T10:25:00.000Z', { close: '118' }))
      .toChartDto()

    expect(merged.kCandles).toHaveLength(1)
    expect(merged.kCandles[0]?.openTime.toISOString()).toBe('2026-09-03T10:00:00.000Z')
    expect(merged.kCandles[0]?.close.toString()).toBe('118')
  })

  it('併進去時最高價取兩者較高', () => {
    const chart = chartOf('1h', ['2026-09-03T10:00:00.000Z'])

    const merged = new LiveKCandleChartDomain(chart)
      .applying(formingAt('2026-09-03T10:25:00.000Z', { high: '125' }))
      .toChartDto()

    expect(merged.kCandles[0]?.high.toString()).toBe('125')
  })

  it('跨過那一小時的邊界才多出新的一根，且對齊到整點', () => {
    const chart = chartOf('1h', ['2026-09-03T10:00:00.000Z'])

    const merged = new LiveKCandleChartDomain(chart)
      .applying(formingAt('2026-09-03T11:05:00.000Z', { close: '131' }))
      .toChartDto()

    expect(merged.kCandles.map(kCandle => kCandle.openTime.toISOString())).toEqual([
      '2026-09-03T10:00:00.000Z',
      '2026-09-03T11:00:00.000Z',
    ])
  })

  it('同一小時裡的好幾根一起併，收盤價取最晚那一根的', () => {
    const chart = chartOf('1h', ['2026-09-03T10:00:00.000Z'])

    const merged = new LiveKCandleChartDomain(chart)
      .applying(formingAt('2026-09-03T10:55:00.000Z', { close: '150', volume: '3' }))
      .applying(formingAt('2026-09-03T10:05:00.000Z', { close: '111', volume: '2' }))
      .toChartDto()

    expect(merged.kCandles[0]?.close.toString()).toBe('150')
    expect(merged.kCandles[0]?.volume.toString()).toBe('5')
  })

  it('畫面看五分鐘一根時，它直接就是最後那一根', () => {
    const chart = chartOf('5m', ['2026-09-03T10:20:00.000Z'])

    const merged = new LiveKCandleChartDomain(chart)
      .applying(formingAt('2026-09-03T10:25:00.000Z', { close: '118' }))
      .toChartDto()

    expect(merged.kCandles).toHaveLength(2)
    expect(merged.kCandles[1]?.openTime.toISOString()).toBe('2026-09-03T10:25:00.000Z')
  })
})
