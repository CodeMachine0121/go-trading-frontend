import { describe, expect, it } from 'vitest'
import { ChartDrawingCommandDto } from '~/domain/models/dto/chart-drawing-command-dto'
import { ChartDrawing } from '~/domain/models/entities/chart-drawing'
import type { ChartDrawingKindValue } from '~/domain/models/vo/chart-drawing-kind-vo'
import { KCandleTimelineDomain } from '~/domain/models/domains/k-candle-timeline-domain'
import { ELEVEN_O_CLOCK, TEN_O_CLOCK, anchorOf, chartDrawingOf } from '../../../fixtures/chart-drawing'
import { KCandleSpec, kCandleChartOf } from '../../../fixtures/k-candle-chart'

const TREND_LINE = chartDrawingOf(1, 'trendLine', [anchorOf(TEN_O_CLOCK, '100'), anchorOf(ELEVEN_O_CLOCK, '110')])

describe('ChartDrawingDomain：改樣式', () => {
  it.each([
    [1, 2], [2, 3], [3, 4], [4, 1],
  ])('線寬 %s 按一次變 %s', (from, to) => {
    const drawing = chartDrawingOf(1, 'trendLine', TREND_LINE.anchors, false, from)

    expect(drawing.toDomain().applied(new ChartDrawingCommandDto('cycleLineWidth')).toDto().lineWidth).toBe(to)
  })

  it.each([
    ['solid', 'dashed'], ['dashed', 'dotted'], ['dotted', 'solid'],
  ] as const)('線型 %s 按一次變 %s', (from, to) => {
    const drawing = chartDrawingOf(1, 'trendLine', TREND_LINE.anchors, false, 1, from)

    expect(drawing.toDomain().applied(new ChartDrawingCommandDto('cycleLineStyle')).toDto().lineStyle).toBe(to)
  })

  it('換成調色盤上的紅色', () => {
    const changed = TREND_LINE.toDomain().applied(
      new ChartDrawingCommandDto('changeColor', [], '--color-drawing-red'))

    expect(changed.toDto().colorToken).toBe('--color-drawing-red')
  })

  it('調色盤上沒有的顏色不換', () => {
    const changed = TREND_LINE.toDomain().applied(new ChartDrawingCommandDto('changeColor', [], '#ff0000'))

    expect(changed.toDto().colorToken).toBe('--color-drawing-blue')
  })

  it.each(['fibonacciRetracement', 'dateAndPriceRange'] as const)(
    '%s 用固定配色：改線寬、線型、線色都不變', (kind) => {
      const fixed = chartDrawingOf(1, kind, TREND_LINE.anchors).toDomain()

      expect(fixed.toDto().styleEditable).toBe(false)
      expect(fixed.applied(new ChartDrawingCommandDto('cycleLineWidth'))).toBe(fixed)
      expect(fixed.applied(new ChartDrawingCommandDto('cycleLineStyle'))).toBe(fixed)
      expect(fixed.applied(new ChartDrawingCommandDto('changeColor', [], '--color-drawing-red'))).toBe(fixed)
    })
})

describe('ChartDrawingDomain：移動與鎖定', () => {
  it('換錨點：只換成給它的那幾個', () => {
    const moved = TREND_LINE.toDomain().applied(new ChartDrawingCommandDto('replaceAnchors',
      [anchorOf(TEN_O_CLOCK, '105'), anchorOf(ELEVEN_O_CLOCK, '115')]))

    expect(moved.toDto().anchors.map(anchor => anchor.price.toString())).toEqual(['105', '115'])
  })

  it('鎖定的繪圖換不了錨點', () => {
    const locked = chartDrawingOf(1, 'trendLine', TREND_LINE.anchors, true).toDomain()

    expect(locked.applied(new ChartDrawingCommandDto('replaceAnchors',
      [anchorOf(TEN_O_CLOCK, '1'), anchorOf(ELEVEN_O_CLOCK, '2')]))).toBe(locked)
  })

  it('錨點數對不上這種繪圖時不換', () => {
    const drawing = TREND_LINE.toDomain()

    expect(drawing.applied(new ChartDrawingCommandDto('replaceAnchors', [anchorOf(TEN_O_CLOCK, '1')]))).toBe(drawing)
  })

  it.each([
    ['toggleLocked', 'locked'], ['toggleVisible', 'visible'],
  ] as const)('%s 把 %s 反過來', (command, field) => {
    const before = TREND_LINE.toDomain().toDto()[field]

    expect(TREND_LINE.toDomain().applied(new ChartDrawingCommandDto(command)).toDto()[field]).toBe(!before)
  })
})

describe('ChartDrawingDomain：讀進來的值收進合理範圍', () => {
  it('線寬超出一到四夾回來、認不得的顏色退回這種繪圖的預設色、多的錨點丟掉', () => {
    const odd = new ChartDrawing(1, 'rectangle',
      [anchorOf(TEN_O_CLOCK, '1'), anchorOf(ELEVEN_O_CLOCK, '2'), anchorOf(ELEVEN_O_CLOCK, '3')],
      'chartreuse', 9, 'solid', false, true).toDomain().toDto()

    expect(odd.lineWidth).toBe(4)
    expect(odd.colorToken).toBe('--color-drawing-purple')
    expect(odd.anchors).toHaveLength(2)
  })

  it('線寬不是整數時退回這種繪圖的預設線寬', () => {
    const odd = new ChartDrawing(1, 'trendLine', TREND_LINE.anchors, '--color-drawing-blue', 1.5, 'solid', false, true)

    expect(odd.toDomain().toDto().lineWidth).toBe(2)
  })
})

describe('ChartDrawingDomain：放到圖上', () => {
  const chart = kCandleChartOf('1h', [new KCandleSpec(TEN_O_CLOCK), new KCandleSpec(ELEVEN_O_CLOCK)])

  it('錨點換成這張圖上的第幾根', () => {
    const placed = TREND_LINE.toDomain().placedOn(new KCandleTimelineDomain(chart), chart.kCandles)

    expect(placed.anchors.map(anchor => anchor.logicalIndex)).toEqual([0, 1])
    expect(placed.fibonacciLevels).toEqual([])
    expect(placed.measurement).toBeNull()
  })

  it('斐波那契回撤帶出七條', () => {
    const fibonacci = chartDrawingOf(2, 'fibonacciRetracement', TREND_LINE.anchors).toDomain()

    expect(fibonacci.placedOn(new KCandleTimelineDomain(chart), chart.kCandles).fibonacciLevels).toHaveLength(7)
  })

  it('日期與價格範圍帶出測量', () => {
    const range = chartDrawingOf(3, 'dateAndPriceRange', TREND_LINE.anchors).toDomain()

    expect(range.placedOn(new KCandleTimelineDomain(chart), chart.kCandles).measurement?.priceDifference.toString())
      .toBe('10')
  })
})

describe('ChartDrawingDomain：認不得的種類', () => {
  it('退回趨勢線，不讓一個陌生字串弄壞整張圖', () => {
    const unknown = new ChartDrawing(1, 'spiral' as ChartDrawingKindValue, TREND_LINE.anchors,
      '--color-drawing-blue', 1, 'solid', false, true)

    expect(unknown.toDomain().toDto().kind).toBe('trendLine')
  })
})

describe('ChartDrawingDomain：奇異筆', () => {
  const brushAnchors = (count: number) => Array.from({ length: count }, (_, index) =>
    anchorOf(new Date(Date.UTC(2026, 9, 16, 10, index)).toISOString(), '100'))
  const brushOf = (count: number) => chartDrawingOf(1, 'brush', brushAnchors(count))

  it('讀進來超過 200 個點：多的丟掉', () => {
    expect(brushOf(230).toDomain().toDto().anchors).toHaveLength(200)
  })

  it.each([
    [1, false],
    [2, true],
    [200, true],
    [201, false],
  ])('整筆換成 %s 個點：收不收（%s）', (count, accepted) => {
    const replaced = brushOf(5).toDomain().applied(new ChartDrawingCommandDto('replaceAnchors', brushAnchors(count)))

    expect(replaced.toDto().anchors.length === count).toBe(accepted)
  })

  it('沒有逐點把手的自由筆跡、預設可改樣式', () => {
    const drawing = brushOf(3).toDomain().toDto()

    expect(drawing.freehand).toBe(true)
    expect(drawing.styleEditable).toBe(true)
    expect(drawing.kindLabel.traditionalChinese).toBe('奇異筆')
  })

  it('放到一小時圖上：點落在那一根裡的位置，不對齊到整根', () => {
    const chart = kCandleChartOf('1h', [new KCandleSpec(TEN_O_CLOCK), new KCandleSpec(ELEVEN_O_CLOCK)])
    const brush = chartDrawingOf(1, 'brush', [anchorOf('2026-10-16T10:15:00.000Z', '100'), anchorOf('2026-10-16T11:45:00.000Z', '101')])

    const placed = brush.toDomain().placedOn(new KCandleTimelineDomain(chart), chart.kCandles)

    expect(placed.anchors.map(anchor => anchor.logicalIndex)).toEqual([0.25, 1.75])
  })

  it('其他繪圖放到圖上仍對到涵蓋它的那一根', () => {
    const chart = kCandleChartOf('1h', [new KCandleSpec(TEN_O_CLOCK), new KCandleSpec(ELEVEN_O_CLOCK)])
    const trendLine = chartDrawingOf(1, 'trendLine', [anchorOf('2026-10-16T10:15:00.000Z', '100'), anchorOf(ELEVEN_O_CLOCK, '101')])

    expect(trendLine.toDomain().placedOn(new KCandleTimelineDomain(chart), chart.kCandles).anchors.map(anchor => anchor.logicalIndex))
      .toEqual([0, 1])
  })
})

describe('ChartDrawingDomain：價格一定大於零', () => {
  it.each([
    ['brush', '0'],
    ['brush', '-5'],
    ['trendLine', '-1'],
  ] as const)('%s 拖到價格 %s：不動', (kind, price) => {
    const drawing = chartDrawingOf(1, kind, [anchorOf(TEN_O_CLOCK, '100'), anchorOf(ELEVEN_O_CLOCK, '110')]).toDomain()

    const moved = drawing.applied(new ChartDrawingCommandDto('replaceAnchors', [anchorOf(TEN_O_CLOCK, '100'), anchorOf(ELEVEN_O_CLOCK, price)]))

    expect(moved).toBe(drawing)
  })
})
