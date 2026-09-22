import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { DrawnKCandleRangeDomain } from '~/domain/models/domains/drawn-k-candle-range-domain'
import { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { KCandle } from '~/domain/models/entities/k-candle'
import { ChartVisibleRangeVo } from '~/domain/models/vo/chart-visible-range-vo'
import { AGGREGATION_INTERVALS } from '~/domain/models/vo/aggregation-interval-vo'
import { AUTOMATIC_AGGREGATION_INTERVAL_CHOICE } from '../../../fixtures/aggregation-interval-choice'

/** 十一根，整點起每五分鐘一根：09:00、09:05 …… 09:50。序位 0 到 10。 */
const ELEVEN_OPEN_TIMES = [
  '2026-09-03T09:00:00.000Z', '2026-09-03T09:05:00.000Z', '2026-09-03T09:10:00.000Z',
  '2026-09-03T09:15:00.000Z', '2026-09-03T09:20:00.000Z', '2026-09-03T09:25:00.000Z',
  '2026-09-03T09:30:00.000Z', '2026-09-03T09:35:00.000Z', '2026-09-03T09:40:00.000Z',
  '2026-09-03T09:45:00.000Z', '2026-09-03T09:50:00.000Z',
]

function chartOf(openTimes: string[]): KCandleChartDto {
  const interval = AGGREGATION_INTERVALS[0]
  if (interval === undefined) {
    throw new Error('沒有任何彙總刻度')
  }

  return new KCandleChartDto(
    'BTCUSDT',
    interval,
    new Date('2026-09-03T00:00:00.000Z'),
    new Date('2026-09-03T23:59:00.000Z'),
    openTimes.map(openTime => new KCandle(
      'BTCUSDT', new Date(openTime),
      new Decimal('100'), new Decimal('120'), new Decimal('90'), new Decimal('110'),
      new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'),
    ).toDomain().toDto()),
    AUTOMATIC_AGGREGATION_INTERVAL_CHOICE,
  )
}

function drawnRangeOf(openTimes: string[], startTime: string, endTime: string) {
  return new DrawnKCandleRangeDomain(
    chartOf(openTimes),
    new ChartVisibleRangeVo(new Date(startTime), new Date(endTime)),
  ).toVo()
}

describe('看得到最新那一根時，右邊留一段空白', () => {
  it('畫到最後一根之後，再多留正在看的那幾根的一成', () => {
    // 十一根全在畫面上（序位 0 到 10），留白 ＝ 十根 × 一成 ＝ 一根的寬度。
    // 最新那一根因此整根看得見，而不是被右緣切掉半根。
    const drawnRange = drawnRangeOf(
      ELEVEN_OPEN_TIMES, '2026-09-03T09:00:00.000Z', '2026-09-03T10:00:00.000Z')

    expect(drawnRange).toEqual({ from: 0, to: 11 })
  })

  it('右端正好落在最新那一根的起始時間上，也算看得到它', () => {
    // 邊界取「含」：使用者明明拖到了最新那一根卻沒有留白，比多留一段難理解得多。
    const drawnRange = drawnRangeOf(
      ELEVEN_OPEN_TIMES, '2026-09-03T09:00:00.000Z', '2026-09-03T09:50:00.000Z')

    expect(drawnRange).toEqual({ from: 0, to: 11 })
  })

  it('看得越長，留白跟著等比例變寬——它是一成，不是固定幾根', () => {
    // 只看後面六根（序位 5 到 10）時，留白是五根的一成，也就是半根。
    // 固定幾根的話，看一整年時那幾根會窄到看不出來，留白等於沒有。
    const drawnRange = drawnRangeOf(
      ELEVEN_OPEN_TIMES, '2026-09-03T09:25:00.000Z', '2026-09-03T10:00:00.000Z')

    expect(drawnRange).toEqual({ from: 5, to: 10.5 })
  })
})

describe('看一段已經過去的行情時不留白', () => {
  it('最新那一根不在畫面上時，右邊畫到那一段的最後一根為止', () => {
    // 右邊本來就還有 K 線，硬留一段空白等於把它們推出畫面外，
    // 而使用者往回拖正是為了看那些。
    const drawnRange = drawnRangeOf(
      ELEVEN_OPEN_TIMES, '2026-09-03T09:00:00.000Z', '2026-09-03T09:20:00.000Z')

    expect(drawnRange).toEqual({ from: 0, to: 4 })
  })

  it('同一段問幾次都是同一個答案——畫面不會每問一次就多長一成', () => {
    // 這是使用者連續往回拖十次仍停在他拖到的位置的保證：
    // 答案只由這一次的顯示區間決定，不參考上一次畫出來的那一段。
    const askTwice = [0, 1].map(() => drawnRangeOf(
      ELEVEN_OPEN_TIMES, '2026-09-03T09:00:00.000Z', '2026-09-03T09:20:00.000Z'))

    expect(askTwice[0]).toEqual(askTwice[1])
  })
})

describe('兩端對齊到真正存在的那幾根', () => {
  it('起點落在兩根之間時，取第一根不早於它的', () => {
    const drawnRange = drawnRangeOf(
      ELEVEN_OPEN_TIMES, '2026-09-03T09:12:00.000Z', '2026-09-03T09:22:00.000Z')

    expect(drawnRange).toEqual({ from: 3, to: 4 })
  })

  it('那一段整個落在兩根之間時，起點退到終點那一根——交叉的一段畫不出來', () => {
    // 資料稀疏時（休市、缺漏）兩端會對齊到交叉的位置：
    // 起點往後對齊到九點十分那一根，終點往前對齊到九點零五那一根。
    const drawnRange = drawnRangeOf(
      ELEVEN_OPEN_TIMES, '2026-09-03T09:06:00.000Z', '2026-09-03T09:09:00.000Z')

    expect(drawnRange).toEqual({ from: 1, to: 1 })
  })

  it('那一段整個落在資料開始之前時，退到第一根', () => {
    const drawnRange = drawnRangeOf(
      ELEVEN_OPEN_TIMES, '2026-09-03T07:00:00.000Z', '2026-09-03T08:00:00.000Z')

    expect(drawnRange).toEqual({ from: 0, to: 0 })
  })

  it('那一段整個落在資料結束之後時，退到最後一根', () => {
    // 手上這批停在很久以前（例如市場早就收盤了），而他看的是現在。
    // 兩端都退到最後一根，畫面上因此仍有東西，不是一片空白。
    const drawnRange = drawnRangeOf(
      ELEVEN_OPEN_TIMES, '2026-09-03T18:00:00.000Z', '2026-09-03T19:00:00.000Z')

    expect(drawnRange).toEqual({ from: 10, to: 10 })
  })
})

describe('沒有東西可畫時', () => {
  it('一根都沒有的那一批，說不出要從第幾根畫到第幾根', () => {
    const drawnRange = drawnRangeOf(
      [], '2026-09-03T09:00:00.000Z', '2026-09-03T10:00:00.000Z')

    expect(drawnRange).toBeNull()
  })

  it('連一批都還沒有的時候也一樣', () => {
    const drawnRange = new DrawnKCandleRangeDomain(
      null,
      new ChartVisibleRangeVo(
        new Date('2026-09-03T09:00:00.000Z'), new Date('2026-09-03T10:00:00.000Z')),
    ).toVo()

    expect(drawnRange).toBeNull()
  })
})
