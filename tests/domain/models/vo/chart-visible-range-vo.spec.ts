import { describe, expect, it } from 'vitest'
import { ChartVisibleRangeVo } from '~/domain/models/vo/chart-visible-range-vo'

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

describe('顯示區間：看得到最新那一根嗎', () => {
  // 這條問句決定兩件事：指標算到哪一刻，以及一根走完時要不要重算。
  // 判準刻意不是時間門檻——多少分鐘算「現在」沒有正確答案，而且會隨彙總刻度改變意義。
  it.each([
    {
      name: '最新那一根在這一段之內，看得到',
      range: rangeOf('2026-09-03T09:00:00.000Z', '2026-09-03T12:00:00.000Z'),
      latest: new Date('2026-09-03T11:55:00.000Z'),
      expected: true,
    },
    {
      name: '最新那一根還在這一段的右端之後，看不到',
      range: rangeOf('2026-09-03T06:00:00.000Z', '2026-09-03T09:00:00.000Z'),
      latest: new Date('2026-09-03T11:55:00.000Z'),
      expected: false,
    },
    {
      name: '剛好卡在右端上，算看得到',
      range: rangeOf('2026-09-03T09:00:00.000Z', '2026-09-03T11:55:00.000Z'),
      latest: new Date('2026-09-03T11:55:00.000Z'),
      expected: true,
    },
    {
      name: '差一毫秒就看不到',
      range: rangeOf('2026-09-03T09:00:00.000Z', '2026-09-03T11:54:59.999Z'),
      latest: new Date('2026-09-03T11:55:00.000Z'),
      expected: false,
    },
    {
      name: '圖上一根都沒有時，不算在看現在',
      range: rangeOf('2026-09-03T09:00:00.000Z', '2026-09-03T12:00:00.000Z'),
      latest: null,
      expected: false,
    },
  ])('$name', ({ range, latest, expected }) => {
    expect(range.showsTheLatestKCandle(latest)).toBe(expected)
  })
})

describe('顯示區間：拿去算指標時是哪一段', () => {
  it('起點就是這一段的左端', () => {
    const range = rangeOf('2026-09-03T09:00:00.000Z', '2026-09-03T12:00:00.000Z')

    expect(range.toObservationWindow(null).startTime)
      .toEqual(new Date('2026-09-03T09:00:00.000Z'))
  })

  it('看得到最新那一根,終點就不指定——交給系統的「現在」', () => {
    // 系統本來就規定未指定即視為現在，所以「跟著市場走」是不要去指定它。
    const range = rangeOf('2026-09-03T09:00:00.000Z', '2026-09-03T12:00:00.000Z')

    expect(range.toObservationWindow(new Date('2026-09-03T11:55:00.000Z')).endTime).toBeNull()
  })

  it('看不到最新那一根,終點就是這一段的右端', () => {
    // 一段已經過去的行情，答案不該因為現在又走完一根而改變。
    const range = rangeOf('2026-09-03T06:00:00.000Z', '2026-09-03T09:00:00.000Z')

    expect(range.toObservationWindow(new Date('2026-09-03T11:55:00.000Z')).endTime)
      .toEqual(new Date('2026-09-03T09:00:00.000Z'))
  })

  it('圖上一根都沒有時,終點是這一段的右端', () => {
    const range = rangeOf('2026-09-03T06:00:00.000Z', '2026-09-03T09:00:00.000Z')

    expect(range.toObservationWindow(null).endTime)
      .toEqual(new Date('2026-09-03T09:00:00.000Z'))
  })

  it('交出去的是一段行情,不是它有幾格', () => {
    // 一段裡有幾格取決於那個市場在這段時間裡實際開了多久——那是系統的答案，
    // 而顯示區間答不出來：它只知道自己從哪裡到哪裡。
    const window = rangeOf('2026-09-03T09:00:00.000Z', '2026-09-03T12:00:00.000Z')
      .toObservationWindow(null)

    expect(Object.keys(window)).toEqual(['startTime', 'endTime'])
  })
})
