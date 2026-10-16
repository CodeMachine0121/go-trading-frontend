import { describe, expect, it } from 'vitest'
import { FittingAggregationIntervalDomain } from '~/domain/models/domains/fitting-aggregation-interval-domain'

const START = new Date('2026-09-01T00:00:00.000Z')
const MILLISECONDS_PER_MINUTE = 60 * 1000

describe('畫一段時間時合適的粗細：塞得進九百根的最細那一種', () => {
  it.each([
    ['九百分鐘剛好塞得進一分鐘', 900, '1m'],
    ['九百零一分鐘就換五分鐘', 901, '5m'],
    ['三天仍是五分鐘', 3 * 24 * 60, '5m'],
    ['四天換十五分鐘', 4 * 24 * 60, '15m'],
    ['一個月換一小時', 30 * 24 * 60, '1h'],
    ['四個月換四小時', 120 * 24 * 60, '4h'],
    ['一年換一天', 365 * 24 * 60, '1d'],
    ['長到連一天都塞不下時仍用一天', 1000 * 24 * 60, '1d'],
  ])('%s', (_case, spanMinutes, expected) => {
    const choice = new FittingAggregationIntervalDomain(
      START, new Date(START.getTime() + spanMinutes * MILLISECONDS_PER_MINUTE)).toChoiceDto()

    expect(choice.declaredInterval).toBe(expected)
  })
})
