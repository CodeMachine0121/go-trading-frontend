import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { EquityPointDto } from '~/domain/models/dto/equity-point-dto'
import { EquityCurveSamplingDomain } from '~/domain/models/domains/equity-curve-sampling-domain'

function curveOf(pointCount: number, lowestIndex: number): EquityPointDto[] {
  return Array.from({ length: pointCount }, (_, pointIndex) => new EquityPointDto(
    new Date(pointIndex * 60_000),
    // 一條緩緩上升的曲線，在 lowestIndex 那一點有一個深谷。
    pointIndex === lowestIndex ? new Decimal(1) : new Decimal(10_000 + pointIndex)))
}

describe('EquityCurveSamplingDomain', () => {
  it('五萬點取樣到兩千點以內，頭尾與谷底都在', () => {
    const equityCurve = curveOf(50_000, 31_337)

    const sampled = new EquityCurveSamplingDomain(equityCurve).sample()

    expect(sampled.length).toBeLessThanOrEqual(2000)
    expect(sampled[0]).toBe(equityCurve[0])
    expect(sampled.at(-1)).toBe(equityCurve.at(-1))
    expect(sampled).toContain(equityCurve[31_337])
  })

  it('取樣後的點依時間排好', () => {
    const sampled = new EquityCurveSamplingDomain(curveOf(50_000, 7)).sample()

    const openTimes = sampled.map(point => point.openTime.getTime())
    expect(openTimes).toEqual([...openTimes].sort((former, latter) => former - latter))
  })

  it('三百點的曲線每一點都畫', () => {
    const equityCurve = curveOf(300, 10)

    expect(new EquityCurveSamplingDomain(equityCurve).sample()).toEqual(equityCurve)
  })
})
