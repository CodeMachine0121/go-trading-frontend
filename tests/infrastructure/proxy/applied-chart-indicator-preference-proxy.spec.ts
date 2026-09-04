import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppliedChartIndicatorPreferenceProxy } from '~/infrastructure/proxy/applied-chart-indicator-preference-proxy'
import { RememberedAppliedIndicatorVo } from '~/domain/models/vo/remembered-applied-indicator-vo'

const STORAGE_KEY = 'go-trading:chart-applied-indicators'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

function rememberedOf(
  strategyId: number, parameterValues: Record<string, number> = {},
): RememberedAppliedIndicatorVo {
  return new RememberedAppliedIndicatorVo(strategyId, new Map(Object.entries(parameterValues)))
}

/** 讀回來的那幾筆攤成好比對的形狀。 */
function readAsPlain(proxy: AppliedChartIndicatorPreferenceProxy) {
  return proxy.readAppliedChartIndicators().map(
    one => ({ strategyId: one.strategyId, parameterValues: Object.fromEntries(one.parameterValues) }))
}

describe('AppliedChartIndicatorPreferenceProxy：擺過的那幾筆記得住', () => {
  it('寫進去的那幾筆讀得回來，順序不變', () => {
    // 順序有意義：它決定還原之後沒挑過顏色的那幾條線誰先拿到哪個顏色。
    const proxy = new AppliedChartIndicatorPreferenceProxy()

    proxy.writeAppliedChartIndicators([
      rememberedOf(7, { 期數: 20 }),
      rememberedOf(9, { 倍數: 1.5 }),
      rememberedOf(7, { 期數: 60 }),
    ])

    expect(readAsPlain(proxy)).toEqual([
      { strategyId: 7, parameterValues: { 期數: 20 } },
      { strategyId: 9, parameterValues: { 倍數: 1.5 } },
      { strategyId: 7, parameterValues: { 期數: 60 } },
    ])
  })

  it('一個旋鈕都沒有的那一筆也記得住', () => {
    const proxy = new AppliedChartIndicatorPreferenceProxy()

    proxy.writeAppliedChartIndicators([rememberedOf(7)])

    expect(readAsPlain(proxy)).toEqual([{ strategyId: 7, parameterValues: {} }])
  })

  it('後寫的整份蓋掉前寫的——留存的是現在圖上那幾筆', () => {
    const proxy = new AppliedChartIndicatorPreferenceProxy()

    proxy.writeAppliedChartIndicators([rememberedOf(7), rememberedOf(9)])
    proxy.writeAppliedChartIndicators([rememberedOf(9)])

    expect(readAsPlain(proxy)).toEqual([{ strategyId: 9, parameterValues: {} }])
  })

  it('一支都沒擺過就是空的一份', () => {
    expect(new AppliedChartIndicatorPreferenceProxy().readAppliedChartIndicators()).toEqual([])
  })

  it('清成空的之後讀回來是空的', () => {
    const proxy = new AppliedChartIndicatorPreferenceProxy()
    proxy.writeAppliedChartIndicators([rememberedOf(7)])

    proxy.writeAppliedChartIndicators([])

    expect(proxy.readAppliedChartIndicators()).toEqual([])
  })

  it('種類不寫進去——種類是宣告說的，留存它只會讓過期的種類贏過宣告', () => {
    const proxy = new AppliedChartIndicatorPreferenceProxy()

    proxy.writeAppliedChartIndicators([rememberedOf(7, { 期數: 20 })])

    expect(localStorage.getItem(STORAGE_KEY)).not.toContain('lookbackCount')
  })
})

describe('AppliedChartIndicatorPreferenceProxy：留存的東西壞掉時', () => {
  it.each([
    { name: '讀不出來的 JSON', stored: '{{{' },
    { name: '一個物件而不是清單', stored: '{"strategyId":7}' },
    { name: '一個字串', stored: '"7"' },
    { name: '一個數字', stored: '7' },
  ])('$name：當成沒擺過', ({ stored }) => {
    localStorage.setItem(STORAGE_KEY, stored)

    expect(new AppliedChartIndicatorPreferenceProxy().readAppliedChartIndicators()).toEqual([])
  })

  it.each([
    { name: '沒有策略識別碼', entry: '{"parameterValues":{}}' },
    { name: '策略識別碼不是數字', entry: '{"strategyId":"7","parameterValues":{}}' },
    { name: '策略識別碼不是整數', entry: '{"strategyId":7.5,"parameterValues":{}}' },
    { name: '根本不是一個物件', entry: '"7"' },
    { name: '是 null', entry: 'null' },
  ])('其中一筆$name：跳過那一筆，其餘照樣回來', ({ entry }) => {
    // 三支裡壞掉一支時，讓另外兩支照樣回來比讓使用者從零開始有用得多。
    localStorage.setItem(STORAGE_KEY, `[${entry},{"strategyId":9,"parameterValues":{}}]`)

    expect(readAsPlain(new AppliedChartIndicatorPreferenceProxy()))
      .toEqual([{ strategyId: 9, parameterValues: {} }])
  })

  it.each([
    { name: '不是數字', stored: '{"strategyId":7,"parameterValues":{"期數":"20"}}' },
    { name: '是 null', stored: '{"strategyId":7,"parameterValues":{"期數":null}}' },
    { name: '不是有限的數字', stored: '{"strategyId":7,"parameterValues":{"期數":1e999}}' },
  ])('某一格的值$name：跳過那一格，那一筆照樣回來', ({ stored }) => {
    // 那一格之後會拿到宣告的預設值，與「留存裡本來就沒有這個名字」是同一個落點。
    localStorage.setItem(STORAGE_KEY, `[${stored}]`)

    expect(readAsPlain(new AppliedChartIndicatorPreferenceProxy()))
      .toEqual([{ strategyId: 7, parameterValues: {} }])
  })

  it.each([
    { name: '不是一份鍵值對', stored: '{"strategyId":7,"parameterValues":20}' },
    { name: '是 null', stored: '{"strategyId":7,"parameterValues":null}' },
    { name: '整個不存在', stored: '{"strategyId":7}' },
  ])('那幾格$name：那一筆沒有任何留存的值，但照樣回來', ({ stored }) => {
    localStorage.setItem(STORAGE_KEY, `[${stored}]`)

    expect(readAsPlain(new AppliedChartIndicatorPreferenceProxy()))
      .toEqual([{ strategyId: 7, parameterValues: {} }])
  })
})

describe('AppliedChartIndicatorPreferenceProxy：瀏覽器不讓存東西時', () => {
  it('讀不了時當成沒擺過，而不是壞掉', () => {
    // 無痕視窗、封鎖網站資料時存取本身會拋出例外。
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => {
        throw new Error('storage blocked')
      }),
      setItem: vi.fn(),
    })

    expect(new AppliedChartIndicatorPreferenceProxy().readAppliedChartIndicators()).toEqual([])
  })

  it('寫不了時不影響這一次的操作', () => {
    // 那幾支已經在圖上了，只是下次打開得再擺一遍。
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(() => {
        throw new Error('storage blocked')
      }),
    })

    expect(() => new AppliedChartIndicatorPreferenceProxy()
      .writeAppliedChartIndicators([rememberedOf(7)])).not.toThrow()
  })
})
