import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { Backtest, BacktestTradeStatistics, EquityPoint } from '~/domain/models/entities/backtest'

function replayOf(
  startTime: string, endTime: string,
  split: { inSample: Backtest, validation: Backtest } | null = null,
  fillTiming = 'close',
): Backtest {
  return new Backtest(
    'BTCUSDT', '1h', new Date(startTime), new Date(endTime), 5,
    new Decimal('10000'), new Decimal('12500'), 0.25, 0.1, 0.5, 0, 0, 0, 0, new Decimal(0),
    [], [new EquityPoint(new Date(startTime), new Decimal('10000'))],
    null,
    new BacktestTradeStatistics(2.5, new Decimal(75), 9000, 1, 0.25),
    fillTiming,
    split === null ? null : new Date('2026-01-21T00:00:00Z'),
    split?.inSample ?? null,
    split?.validation ?? null)
}

describe('BacktestDomain 結果畫成哪幾塊', () => {
  it('沒有驗證起點時只有整段一塊，沒有標題', () => {
    const sections = replayOf('2026-01-01T00:00:00Z', '2026-01-31T23:00:00Z').toDomain().toDto().sections

    expect(sections.map(section => section.kind)).toEqual(['whole'])
    expect(sections[0]!.title).toBeNull()
    expect(sections[0]!.emphasized).toBe(false)
  })

  it('有驗證起點時依序是驗證段、調參段、整段，驗證段醒目並說以它為準', () => {
    const sections = replayOf('2026-01-01T00:00:00Z', '2026-01-31T23:00:00Z', {
      inSample: replayOf('2026-01-01T00:00:00Z', '2026-01-20T23:00:00Z'),
      validation: replayOf('2026-01-21T00:00:00Z', '2026-01-31T23:00:00Z'),
    }).toDomain().toDto().sections

    expect(sections.map(section => section.kind)).toEqual(['validation', 'inSample', 'whole'])
    expect(sections.map(section => section.title)).toEqual(['驗證段', '調參段', '整段'])
    expect(sections[0]!.emphasized).toBe(true)
    expect(sections[0]!.note).toBe('這一段是調參數時沒看過的行情，以它為準')
    expect(sections[1]!.note).toBe('這一段是拿來調參數的，成績好看是應該的')
    expect(sections[0]!.startTime).toEqual(new Date('2026-01-21T00:00:00Z'))
    expect(sections[1]!.endTime).toEqual(new Date('2026-01-20T23:00:00Z'))
  })

  it('成績單帶著五格與成交時點', () => {
    const summary = replayOf('2026-01-01T00:00:00Z', '2026-01-31T23:00:00Z', null, 'nextOpen')
      .toDomain().toDto().summary

    expect(summary.fillTimingLabel).toBe('下一格開盤成交')
    expect(summary.tradeStatistics?.profitFactor).toBe('2.50')
    expect(summary.tradeStatistics?.averageHoldingTime).toBe('2 小時 30 分')
  })
  it('每一塊畫的是取樣過的曲線，成績單的數字仍照完整的結果', () => {
    const longCurve = Array.from({ length: 3000 }, (_, pointIndex) =>
      new EquityPoint(new Date(pointIndex * 60_000), new Decimal(10_000 + pointIndex)))
    const replay = new Backtest(
      'BTCUSDT', '1m', new Date(0), new Date(3000 * 60_000), 3000,
      new Decimal('10000'), new Decimal('12999'), 0.3, 0, null, 0, 0, 0, 0, new Decimal(0),
      [], longCurve)

    const resultDto = replay.toDomain().toDto()

    expect(resultDto.equityCurve).toHaveLength(3000)
    expect(resultDto.sections[0]!.chartEquityCurve.length).toBeLessThanOrEqual(2000)
    expect(resultDto.sections[0]!.summary.finalEquity).toBe('12999.00')
  })
})
