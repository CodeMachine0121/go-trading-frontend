import { describe, expect, it } from 'vitest'
import { ChartReadoutDomain } from '~/domain/models/domains/chart-readout-domain'
import { KCandleSpec, kCandleChartOf } from '../../../fixtures/k-candle-chart'

/** 三根一小時：第 0 根開 100 收 110、第 1 根開 108 收 105（跌，且開盤與前一根收盤不同）、第 2 根收 120。 */
const CHART = kCandleChartOf('1h', [
  new KCandleSpec('2026-10-16T10:00:00.000Z', '100', '112', '99', '110'),
  new KCandleSpec('2026-10-16T11:00:00.000Z', '108', '111', '104', '105'),
  new KCandleSpec('2026-10-16T12:00:00.000Z', '105', '121', '105', '120'),
])
const NOW = new Date('2026-10-16T12:30:00.000Z')

describe('ChartReadoutDomain：圖例說的是十字線那一根', () => {
  it('停在一根跌的上面：那一根的開高低收，漲跌相對前一根收盤', () => {
    const readout = new ChartReadoutDomain(CHART, 1, NOW).toDto()

    expect(readout?.kCandle.close.toString()).toBe('105')
    expect(readout?.change.toString()).toBe('-5')
    expect(readout?.changePercentText).toBe('-4.55')
    expect(readout?.tone).toBe('danger')
  })

  it.each([null, 5, -1])('十字線在 %s（不在任何一根上）：說最新那一根', (hoveredIndex) => {
    expect(new ChartReadoutDomain(CHART, hoveredIndex, NOW).toDto()?.kCandle.close.toString()).toBe('120')
  })

  it('第一根沒有前一根：相對它自己的開盤', () => {
    expect(new ChartReadoutDomain(CHART, 0, NOW).toDto()?.change.toString()).toBe('10')
  })

  it('一根都沒有：沒有東西可說', () => {
    expect(new ChartReadoutDomain(kCandleChartOf('1h', []), null, NOW).toDto()).toBeNull()
  })

  it('沒有漲跌時語氣是中性', () => {
    const flat = kCandleChartOf('1h', [new KCandleSpec('2026-10-16T10:00:00.000Z')])

    expect(new ChartReadoutDomain(flat, null, NOW).toDto()?.tone).toBe('neutral')
  })
})

describe('ChartReadoutDomain：收盤倒數', () => {
  it.each([
    ['2026-10-16T12:59:30.000Z', '00:30'],
    ['2026-10-16T12:00:00.000Z', '01:00:00'],
    ['2026-10-16T13:00:00.000Z', null],
  ])('現在 %s：倒數 %s', (now, countdown) => {
    expect(new ChartReadoutDomain(CHART, null, new Date(now)).toDto()?.countdown).toBe(countdown)
  })
})

describe('ChartReadoutDomain：算不出百分比', () => {
  it('前一根收在 0：漲跌照算、百分比說不出來', () => {
    const fromZero = kCandleChartOf('1h', [
      new KCandleSpec('2026-10-16T10:00:00.000Z', '0', '0', '0', '0'),
      new KCandleSpec('2026-10-16T11:00:00.000Z', '0', '5', '0', '5'),
    ])

    const readout = new ChartReadoutDomain(fromZero, 1, NOW).toDto()

    expect(readout?.change.toString()).toBe('5')
    expect(readout?.changePercentText).toBeNull()
  })
})
