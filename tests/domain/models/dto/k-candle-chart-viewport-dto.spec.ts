import { describe, expect, it } from 'vitest'
import { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'
import { DEFAULT_AGGREGATION_INTERVAL_CHOICE } from '../../../fixtures/aggregation-interval-choice'

describe('KCandleChartViewportDto：跳到最新', () => {
  it('同一檔、同樣長度與粗細，結束在這一刻', () => {
    const viewport = new KCandleChartViewportDto('BTCUSDT',
      new Date('2026-10-10T00:00:00.000Z'), new Date('2026-10-12T00:00:00.000Z'), null, DEFAULT_AGGREGATION_INTERVAL_CHOICE)

    const latest = viewport.endingAt(new Date('2026-10-16T09:00:00.000Z'))

    expect(latest.symbol).toBe('BTCUSDT')
    expect(latest.visibleStartTime).toEqual(new Date('2026-10-14T09:00:00.000Z'))
    expect(latest.visibleEndTime).toEqual(new Date('2026-10-16T09:00:00.000Z'))
    expect(latest.aggregationIntervalChoice).toBe(DEFAULT_AGGREGATION_INTERVAL_CHOICE)
  })
})
