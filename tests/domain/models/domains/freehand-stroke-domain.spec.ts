import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { FreehandStrokeDomain } from '~/domain/models/domains/freehand-stroke-domain'
import { ChartDrawingStrokePointDto } from '~/domain/models/dto/chart-drawing-stroke-point-dto'

const pointAt = (x: number, y: number, price = '100') => new ChartDrawingStrokePointDto(x, y, x / 10, new Decimal(price))
const positionsOf = (points: readonly ChartDrawingStrokePointDto[]) => points.map(point => [point.x, point.y])

/** 一條鋸齒：每一點上下交錯 20 像素，沒有一點能省。 */
const zigzag = (count: number) => Array.from({ length: count }, (_, index) => pointAt(index * 5, index % 2 === 0 ? 0 : 20))

describe('FreehandStrokeDomain：收成要留下的點', () => {
  it('幾乎筆直的一筆（偏離都不到一像素）只留頭尾兩點', () => {
    const nearlyStraight = Array.from({ length: 51 }, (_, index) => pointAt(index * 4, index % 2 === 0 ? 100 : 100.6))

    expect(positionsOf(new FreehandStrokeDomain(nearlyStraight, 200).simplified())).toEqual([[0, 100], [200, 100]])
  })

  it('一個轉角偏離超過一像素：轉角留著', () => {
    const corner = [pointAt(0, 0), pointAt(50, 0), pointAt(100, 0), pointAt(100, 50), pointAt(100, 100)]

    expect(positionsOf(new FreehandStrokeDomain(corner, 200).simplified())).toEqual([[0, 0], [100, 0], [100, 100]])
  })

  it.each([
    [150, 150],
    [200, 200],
    [500, 200],
  ])('精簡完還有 %s 個點：留下 %s 個，頭尾都在', (count, kept) => {
    const points = zigzag(count)

    const simplified = new FreehandStrokeDomain(points, 200).simplified()

    expect(simplified).toHaveLength(kept)
    expect(simplified[0]).toBe(points[0])
    expect(simplified.at(-1)).toBe(points.at(-1))
  })

  it('價格不大於零的點略過，其餘照留', () => {
    const points = [pointAt(0, 0, '5'), pointAt(10, 50, '0'), pointAt(20, 80, '-3'), pointAt(30, 0, '5')]

    expect(new FreehandStrokeDomain(points, 200).simplified().map(point => point.price.toString())).toEqual(['5', '5'])
  })

  it('按下沒有移動（同一個像素取到好幾次）：只剩一個點', () => {
    expect(new FreehandStrokeDomain([pointAt(30, 30), pointAt(30, 30), pointAt(30, 30)], 200).simplified()).toHaveLength(1)
  })

  it('一個點都沒有（全在零以下）：一個都不留', () => {
    expect(new FreehandStrokeDomain([pointAt(0, 0, '-1'), pointAt(10, 0, '-2')], 200).simplified()).toEqual([])
  })
})
