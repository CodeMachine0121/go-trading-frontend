import { describe, expect, it, vi } from 'vitest'
import { ChartIndicatorDomain } from '~/domain/models/domains/chart-indicator-domain'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'

const FIRST = '--color-chart-line-1'
const SECOND = '--color-chart-line-2'

function calculationOf(
  resultType: string,
  indicatorValues: IndicatorValueVo[],
  openTimes: Date[] = [],
): IndicatorCalculation {
  return new IndicatorCalculation('BTCUSDT', '5m', 3, resultType, indicatorValues, openTimes)
}

function domainOf(
  calculation: IndicatorCalculation,
  remembered: Map<string, string> = new Map(),
  taken: string[] = [],
): ChartIndicatorDomain {
  // 「怎麼回想一個顏色」是一種能力，替身照介面給——不手刻假實作。
  return new ChartIndicatorDomain(7, calculation, {
    readColorToken: vi.fn((lineKey: string) => remembered.get(lineKey) ?? null),
    writeColorToken: vi.fn(),
  }, taken)
}

describe('ChartIndicatorDomain：一個數字畫成水平線', () => {
  it('每個指標名稱一條水平線，帶著它的值', () => {
    const domain = domainOf(calculationOf('float', [new IndicatorValueVo('均價', [115])]))

    const levels = domain.toLevelDtos()

    expect(levels).toHaveLength(1)
    expect(levels[0]?.indicatorName).toBe('均價')
    expect(levels[0]?.value).toBe(115)
    expect(domain.toSeriesDtos()).toEqual([])
  })

  it('一次產出好幾個指標名稱就畫好幾條，且各有各的顏色', () => {
    // 讓它們共用一個顏色，等於畫兩條看起來一樣的線——那正是顏色要解決的問題。
    const domain = domainOf(calculationOf('float', [
      new IndicatorValueVo('最高', [130]),
      new IndicatorValueVo('最低', [90]),
    ]))

    const levels = domain.toLevelDtos()

    expect(levels).toHaveLength(2)
    expect(levels.map(level => level.indicatorName)).toEqual(['最低', '最高'])
    expect(levels[0]?.colorToken).not.toBe(levels[1]?.colorToken)
  })

  it('依名稱排序，所以算式的產出順序換了，線的順序與顏色都不會跟著變', () => {
    // 算式產出的順序不保證固定，而順序在這裡還多決定一件事：誰先拿到哪個顏色。
    // 比的是碼位而不是語系字序，所以這裡驗的是**兩種輸入順序得到同一個輸出**。
    const oneOrder = domainOf(calculationOf('float', [
      new IndicatorValueVo('乙', [2]),
      new IndicatorValueVo('甲', [1]),
    ])).toLevelDtos()
    const otherOrder = domainOf(calculationOf('float', [
      new IndicatorValueVo('甲', [1]),
      new IndicatorValueVo('乙', [2]),
    ])).toLevelDtos()

    expect(oneOrder.map(level => level.indicatorName))
      .toEqual(otherOrder.map(level => level.indicatorName))
    expect(oneOrder.map(level => level.colorToken))
      .toEqual(otherOrder.map(level => level.colorToken))
  })

  it('兩個指標名稱相同時比較器仍然一致，兩條都留著', () => {
    // 名稱由算式作者決定，系統那頭以名稱為鍵所以本來就不會重複；
    // 但比較器對相等的兩者必須回答「相等」，否則排序結果就不是良好定義的。
    const domain = domainOf(calculationOf('float', [
      new IndicatorValueVo('同名', [1]),
      new IndicatorValueVo('同名', [2]),
    ]))

    expect(domain.toLevelDtos().map(level => level.value)).toEqual([1, 2])
  })
})

describe('ChartIndicatorDomain：一串數字畫成跟著 K 線走的曲線', () => {
  const openTimes = [
    new Date('2026-09-02T10:00:00.000Z'),
    new Date('2026-09-02T10:05:00.000Z'),
    new Date('2026-09-02T10:10:00.000Z'),
  ]

  it('個數一樣時逐一對上', () => {
    const domain = domainOf(
      calculationOf('floatList', [new IndicatorValueVo('線', [100, 110, 120])], openTimes))

    const series = domain.toSeriesDtos()

    expect(series).toHaveLength(1)
    expect(series[0]?.points.map(point => point.value)).toEqual([100, 110, 120])
    expect(series[0]?.points.map(point => point.openTime)).toEqual(openTimes)
    expect(domain.toLevelDtos()).toEqual([])
  })

  it('值比 K 線少時靠右對齊——少掉的是最前面那幾根', () => {
    // 滾動窗口的指標本來就是這樣：二十期均線吃一百根只回得出八十一個值，
    // 前十九根湊不滿一個窗口。靠左對齊會把整條線往左推十九格，
    // 而一條位移的線看起來完全正常。
    const domain = domainOf(
      calculationOf('floatList', [new IndicatorValueVo('線', [100, 110])], openTimes))

    const points = domain.toSeriesDtos()[0]?.points ?? []

    expect(points.map(point => point.openTime)).toEqual(openTimes.slice(1, 3))
    expect(points.map(point => point.value)).toEqual([100, 110])
  })

  it('最後一個值永遠落在最後一根 K 線上', () => {
    const domain = domainOf(
      calculationOf('floatList', [new IndicatorValueVo('線', [100])], openTimes))

    const points = domain.toSeriesDtos()[0]?.points ?? []

    expect(points).toHaveLength(1)
    expect(points[0]?.openTime).toEqual(openTimes[2])
  })

  it('值比 K 線多時，多出來的那幾個落在頭部之外，不畫', () => {
    const domain = domainOf(
      calculationOf('floatList', [new IndicatorValueVo('線', [100, 110, 120])],
        openTimes.slice(0, 1)))

    const points = domain.toSeriesDtos()[0]?.points ?? []

    expect(points).toHaveLength(1)
    // 留下來的是最後一個值，配上唯一那一根。
    expect(points[0]?.value).toBe(120)
  })

  it('沒回起始時間時一點都不畫——寧可沒有線，也不要一條錯位的線', () => {
    const domain = domainOf(calculationOf('floatList', [new IndicatorValueVo('線', [100, 110])]))

    expect(domain.toSeriesDtos()[0]?.points).toEqual([])
  })
})

describe('ChartIndicatorDomain：顏色', () => {
  it('這條線挑過的顏色優先於依序取', () => {
    const remembered = new Map([['7:均價', SECOND]])
    const domain = domainOf(calculationOf('float', [new IndicatorValueVo('均價', [115])]), remembered)

    expect(domain.toLevelDtos()[0]?.colorToken).toBe(SECOND)
  })

  it('避開圖上其他線已經用掉的顏色', () => {
    const domain = domainOf(
      calculationOf('float', [new IndicatorValueVo('均價', [115])]), new Map(), [FIRST])

    expect(domain.toLevelDtos()[0]?.colorToken).toBe(SECOND)
  })

  it('線的身分是策略加指標名稱，所以重新打開畫面後還認得出自己', () => {
    const domain = domainOf(calculationOf('float', [new IndicatorValueVo('均價', [115])]))

    expect(domain.toLevelDtos()[0]?.lineKey).toBe('7:均價')
  })
})

describe('ChartIndicatorDomain：畫不出來的東西', () => {
  it('一個指標名稱都沒有時兩份清單都是空的——那是成功，不是失敗', () => {
    const domain = domainOf(calculationOf('float', []))

    expect(domain.toLevelDtos()).toEqual([])
    expect(domain.toSeriesDtos()).toEqual([])
  })

  it.each([
    { kind: '一個是非', resultType: 'bool', items: [true] },
    { kind: '一串是非', resultType: 'boolList', items: [true, false] },
  ])('值是$kind 時連一條空的線都不產出', ({ resultType, items }) => {
    // 是非沒有數值可以擺在價格軸上。挑策略時就該擋下，這裡是最後一道。
    //
    // 「一條零點的線」與「沒有線」不是同一件事：前者會在已套用清單上長出一列
    // 有名字、有顏色、卻永遠畫不出東西的幽靈線。所以驗的是清單為空，
    // 而不是「畫出來的點數為零」。
    const domain = domainOf(calculationOf(resultType, [new IndicatorValueVo('漲', items)]))

    expect(domain.toLevelDtos()).toEqual([])
    expect(domain.toSeriesDtos()).toEqual([])
  })

  it('一個數字的種類下卻沒有值時，那一條不畫，其他條照畫', () => {
    const domain = domainOf(calculationOf('float', [
      new IndicatorValueVo('空的', []),
      new IndicatorValueVo('有值', [115]),
    ]))

    expect(domain.toLevelDtos().map(level => level.indicatorName)).toEqual(['有值'])
  })
})
