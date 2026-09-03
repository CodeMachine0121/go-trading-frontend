import { describe, expect, it } from 'vitest'
import { ChartVisibleRangeVo } from '~/domain/models/vo/chart-visible-range-vo'
import { AGGREGATION_INTERVALS } from '~/domain/models/vo/aggregation-interval-vo'

function intervalOf(value: string) {
  const interval = AGGREGATION_INTERVALS.find(candidate => candidate.value === value)
  if (interval === undefined) {
    throw new Error(`找不到彙總刻度 ${value}`)
  }

  return interval
}

function rangeOf(startTime: string, endTime: string) {
  return new ChartVisibleRangeVo(new Date(startTime), new Date(endTime))
}

describe('顯示區間：跟另一段是不是同一段', () => {
  // 這條問句本身就是一條業務規則：同一段區間算出來的必然一樣，所以問完就有理由不重算。
  it.each([
    {
      name: '起訖都相同就是同一段，即使是兩個不同的物件',
      left: rangeOf('2026-09-03T09:00:00.000Z', '2026-09-03T12:00:00.000Z'),
      right: rangeOf('2026-09-03T09:00:00.000Z', '2026-09-03T12:00:00.000Z'),
      expected: true,
    },
    {
      name: '起點差一毫秒就不是同一段',
      left: rangeOf('2026-09-03T09:00:00.000Z', '2026-09-03T12:00:00.000Z'),
      right: rangeOf('2026-09-03T09:00:00.001Z', '2026-09-03T12:00:00.000Z'),
      expected: false,
    },
    {
      name: '終點差一毫秒就不是同一段',
      left: rangeOf('2026-09-03T09:00:00.000Z', '2026-09-03T12:00:00.000Z'),
      right: rangeOf('2026-09-03T09:00:00.000Z', '2026-09-03T12:00:00.001Z'),
      expected: false,
    },
  ])('$name', ({ left, right, expected }) => {
    expect(left.isSameAs(right)).toBe(expected)
  })

  it('還沒有上一段可比時不算同一段', () => {
    // 沒比過就沒有理由跳過——第一次一定要算。
    expect(rangeOf('2026-09-03T09:00:00.000Z', '2026-09-03T12:00:00.000Z')
      .isSameAs(null)).toBe(false)
  })
})

describe('顯示區間：這一段裡有幾根', () => {
  it.each([
    { name: '兩小時、五分鐘一根 → 24 根', from: '09:00', to: '11:00', interval: '5m', expected: 24 },
    { name: '兩小時、一小時一根 → 2 根', from: '09:00', to: '11:00', interval: '1h', expected: 2 },
    { name: '一天、四小時一根 → 6 根', from: '00:00', to: '24:00', interval: '4h', expected: 6 },
    { name: '不滿一根的一段仍然是一根', from: '09:00', to: '09:02', interval: '5m', expected: 1 },
    { name: '長度為零的一段仍然是一根', from: '09:00', to: '09:00', interval: '5m', expected: 1 },
  ])('$name', ({ from, to, interval, expected }) => {
    const endHour = to === '24:00' ? '2026-09-04T00:00:00.000Z' : `2026-09-03T${to}:00.000Z`

    expect(rangeOf(`2026-09-03T${from}:00.000Z`, endHour)
      .kCandleCountAt(intervalOf(interval))).toBe(expected)
  })
})
