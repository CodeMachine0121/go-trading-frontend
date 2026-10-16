import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { FibonacciRetracementDomain } from '~/domain/models/domains/fibonacci-retracement-domain'
import { ChartDrawingAnchorVo } from '~/domain/models/vo/chart-drawing-anchor-vo'

function levelsFrom(firstPrice: string, secondPrice: string) {
  const at = new Date('2026-10-16T10:00:00.000Z')

  return new FibonacciRetracementDomain(
    new ChartDrawingAnchorVo(at, new Decimal(firstPrice)),
    new ChartDrawingAnchorVo(at, new Decimal(secondPrice)),
  ).levels().map(level => [level.ratio, level.price.toString()])
}

describe('FibonacciRetracementDomain：第二點是 0、第一點是 1', () => {
  it('從 100 拉到 200', () => {
    expect(levelsFrom('100', '200')).toEqual([
      [0, '200'], [0.236, '176.4'], [0.382, '161.8'], [0.5, '150'],
      [0.618, '138.2'], [0.786, '121.4'], [1, '100'],
    ])
  })

  it('兩點同價時七條疊在同一個價格上', () => {
    expect(levelsFrom('150', '150').map(([, price]) => price)).toEqual(Array.from({ length: 7 }, () => '150'))
  })
})
