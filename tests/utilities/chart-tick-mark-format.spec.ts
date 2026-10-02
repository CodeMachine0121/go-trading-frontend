import { describe, expect, it } from 'vitest'
import { TickMarkType, type UTCTimestamp } from 'lightweight-charts'
import { formatWallClockTickMark } from '~/utilities/chart-tick-mark-format'

const WALL_CLOCK = (Date.UTC(2026, 7, 30, 12, 5) / 1000) as UTCTimestamp

describe('formatWallClockTickMark', () => {
  it.each([
    { name: '標年的那一格', tickMarkType: TickMarkType.Year, expected: '2026' },
    { name: '標月的那一格', tickMarkType: TickMarkType.Month, expected: '2026-08' },
    { name: '標日的那一格', tickMarkType: TickMarkType.DayOfMonth, expected: '08-30' },
    { name: '標時分的那一格', tickMarkType: TickMarkType.Time, expected: '12:05' },
  ])('$name 照當地時鐘讀數寫成數字，不分語言', ({ tickMarkType, expected }) => {
    expect(formatWallClockTickMark(WALL_CLOCK, tickMarkType, TickMarkType)).toBe(expected)
  })
})
