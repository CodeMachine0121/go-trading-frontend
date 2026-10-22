import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { KCandleTimelineDomain } from '~/domain/models/domains/k-candle-timeline-domain'
import { KCandleSpec, kCandleChartOf } from '../../../fixtures/k-candle-chart'

/** 三根一小時 K 線：10:00、11:00、12:00，序位 0 到 2。 */
const THREE_HOURS = kCandleChartOf('1h', [
  new KCandleSpec('2026-10-16T10:00:00.000Z'),
  new KCandleSpec('2026-10-16T11:00:00.000Z', '100', '105', '99', '103'),
  new KCandleSpec('2026-10-16T12:00:00.000Z'),
])

describe('KCandleTimelineDomain：第幾根與哪一刻互換', () => {
  it.each([
    [1, '2026-10-16T11:00:00.000Z'],
    [4, '2026-10-16T14:00:00.000Z'],
    [-1, '2026-10-16T09:00:00.000Z'],
  ])('第 %s 根的起始時間是 %s（最新之後與最早之前以彙總刻度推算）', (logicalIndex, openTime) => {
    expect(new KCandleTimelineDomain(THREE_HOURS).openTimeAt(logicalIndex)).toEqual(new Date(openTime))
  })

  it.each([
    ['2026-10-16T11:00:00.000Z', 1],
    ['2026-10-16T14:00:00.000Z', 4],
    ['2026-10-16T09:00:00.000Z', -1],
    // 最早那一根之前、沒對齊到整點：落在涵蓋它的那一根（09:00 那一根）
    ['2026-10-16T09:30:00.000Z', -1],
    // 五分鐘圖上畫的點換到一小時圖：落在包含它的那一小時上。
    ['2026-10-16T11:05:00.000Z', 1],
  ])('%s 落在第 %s 根', (openTime, logicalIndex) => {
    expect(new KCandleTimelineDomain(THREE_HOURS).logicalIndexOf(new Date(openTime))).toBe(logicalIndex)
  })

  it('落在兩根之間沒有交易的空檔時，對到之後那一根', () => {
    const withGap = kCandleChartOf('1h', [
      new KCandleSpec('2026-10-16T10:00:00.000Z'),
      new KCandleSpec('2026-10-16T12:00:00.000Z'),
    ])

    expect(new KCandleTimelineDomain(withGap).logicalIndexOf(new Date('2026-10-16T11:00:00.000Z'))).toBe(1)
  })

  it.each([
    [1.4, '2026-10-16T11:00:00.000Z'],
    [1.6, '2026-10-16T12:00:00.000Z'],
  ])('落點在第 %s 根時對齊到最近的那一根（%s）', (logicalIndex, openTime) => {
    const anchor = new KCandleTimelineDomain(THREE_HOURS).alignAnchor(logicalIndex, new Decimal('100'), false)

    expect(anchor.openTime).toEqual(new Date(openTime))
  })
})

describe('KCandleTimelineDomain：奇異筆的點不對齊到整根', () => {
  it.each([
    [1.25, '2026-10-16T11:15:00.000Z'],
    [0, '2026-10-16T10:00:00.000Z'],
    [3.5, '2026-10-16T13:30:00.000Z'],
    [-0.5, '2026-10-16T09:30:00.000Z'],
  ])('落在第 %s 根的位置是 %s；價格原樣', (logicalIndex, time) => {
    const anchor = new KCandleTimelineDomain(THREE_HOURS).freehandAnchor(logicalIndex, new Decimal('104.8'))

    expect(anchor.openTime).toEqual(new Date(time))
    expect(anchor.price.toString()).toBe('104.8')
  })

  it.each([
    ['2026-10-16T11:15:00.000Z', 1.25],
    ['2026-10-16T13:30:00.000Z', 3.5],
    ['2026-10-16T09:30:00.000Z', -0.5],
  ])('%s 落在第 %s 根的位置', (time, logicalIndex) => {
    expect(new KCandleTimelineDomain(THREE_HOURS).fractionalLogicalIndexOf(new Date(time))).toBe(logicalIndex)
  })

  it('一小時圖上 10:20 的點，在五分鐘圖上剛好落在 10:20 那一根', () => {
    const fiveMinutes = kCandleChartOf('5m', Array.from({ length: 12 }, (_, index) =>
      new KCandleSpec(new Date(Date.UTC(2026, 9, 16, 10, index * 5)).toISOString())))
    const drawnOnOneHour = new KCandleTimelineDomain(THREE_HOURS).freehandAnchor(1 / 3, new Decimal('100'))

    expect(new KCandleTimelineDomain(fiveMinutes).fractionalLogicalIndexOf(drawnOnOneHour.openTime)).toBe(4)
  })

  it('一根都沒有的圖：以時間原點當第 0 根，畫出去再讀回來是同一個位置', () => {
    const empty = new KCandleTimelineDomain(kCandleChartOf('1h', []))

    expect(empty.fractionalLogicalIndexOf(empty.freehandAnchor(2.5, new Decimal('1')).openTime)).toBe(2.5)
  })

  it('落在兩根之間沒有交易的空檔時，對到之後那一根', () => {
    const withGap = kCandleChartOf('1h', [
      new KCandleSpec('2026-10-16T10:00:00.000Z'),
      new KCandleSpec('2026-10-16T13:00:00.000Z'),
    ])

    expect(new KCandleTimelineDomain(withGap).fractionalLogicalIndexOf(new Date('2026-10-16T11:30:00.000Z'))).toBe(1)
  })
})

describe('KCandleTimelineDomain：磁鐵模式', () => {
  it('開著磁鐵、落在一根 K 線上：吸到開高低收裡最接近的那一個', () => {
    const anchor = new KCandleTimelineDomain(THREE_HOURS).alignAnchor(1, new Decimal('104.8'), true)

    expect(anchor.price.toString()).toBe('105')
  })

  it('開著磁鐵、落在最新那一根右邊的空白：不吸', () => {
    const anchor = new KCandleTimelineDomain(THREE_HOURS).alignAnchor(4, new Decimal('104.8'), true)

    expect(anchor.price.toString()).toBe('104.8')
    expect(anchor.logicalIndex).toBe(4)
  })

  it('沒開磁鐵：落點就是指到的價格', () => {
    const anchor = new KCandleTimelineDomain(THREE_HOURS).alignAnchor(1, new Decimal('104.8'), false)

    expect(anchor.price.toString()).toBe('104.8')
  })
})

describe('KCandleTimelineDomain：一根都沒有的圖', () => {
  it('不會壞掉：以彙總刻度從時間原點推算', () => {
    const empty = new KCandleTimelineDomain(kCandleChartOf('1h', []))

    expect(empty.openTimeAt(2)).toEqual(new Date(2 * 3_600_000))
    expect(empty.openTimeAt(-1)).toEqual(new Date(-3_600_000))
    expect(empty.logicalIndexOf(new Date(3 * 3_600_000))).toBe(3)
  })
})

describe('KCandleTimelineDomain：把錨點平移幾根', () => {
  it('一根都沒平移：時間原樣不動，連那一根裡的幾分也保留', () => {
    const anchor = new KCandleTimelineDomain(THREE_HOURS).shiftedAnchor(new Date('2026-10-16T10:05:00.000Z'), 0, new Decimal('101'))

    expect(anchor.openTime).toEqual(new Date('2026-10-16T10:05:00.000Z'))
    expect(anchor.price.toString()).toBe('101')
  })

  it('往右兩根：落到那一根上，原本在那一根裡的五分鐘一起保留', () => {
    const anchor = new KCandleTimelineDomain(THREE_HOURS).shiftedAnchor(new Date('2026-10-16T10:05:00.000Z'), 2, new Decimal('101'))

    expect(anchor.openTime).toEqual(new Date('2026-10-16T12:05:00.000Z'))
    expect(anchor.logicalIndex).toBe(2)
  })

  it('平移到最新那一根之後：照彙總刻度往後推', () => {
    const anchor = new KCandleTimelineDomain(THREE_HOURS).shiftedAnchor(new Date('2026-10-16T12:00:00.000Z'), 3, new Decimal('101'))

    expect(anchor.openTime).toEqual(new Date('2026-10-16T15:00:00.000Z'))
  })
})
