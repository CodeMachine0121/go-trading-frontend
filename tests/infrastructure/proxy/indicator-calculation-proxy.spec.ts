import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IndicatorCalculationProxy } from '~/infrastructure/proxy/indicator-calculation-proxy'
import { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'
import { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import { StrategyParameterNotDeclaredError } from '~/domain/errors/strategy-parameter-not-declared-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

const BASE_URL = 'http://localhost:8080'
const SCRIPT_BODY = 'return map[string]float64{"均價": 110}'
const REQUEST = new IndicatorCalculationRequestDomain(
  new IndicatorCalculationRequestDto('BTCUSDT', '5m', 3, SCRIPT_BODY, 'float'))

function requestOf(resultType: string): IndicatorCalculationRequestDomain {
  return new IndicatorCalculationRequestDomain(
    new IndicatorCalculationRequestDto('BTCUSDT', '5m', 3, SCRIPT_BODY, resultType))
}

/** 用真正的 FetchError 當替身：它連不上時照樣有 response 屬性，只是值為 undefined。 */
function buildFetchError(failure: { status?: number, message?: string }) {
  const context = failure.status === undefined
    ? { request: BASE_URL, options: {}, error: new Error('fetch failed') }
    : {
        request: BASE_URL,
        options: {},
        response: {
          status: failure.status,
          statusText: 'rejected',
          _data: failure.message === undefined ? undefined : { message: failure.message },
        },
      }

  return createFetchError(context as unknown as FetchContext)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('IndicatorCalculationProxy', () => {
  it('把交易標的、彙總刻度、根數、指標值種類與組好的算式送到指標計算端點', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT', usedCandleCount: 3, resultType: 'float', values: {},
    })
    vi.stubGlobal('$fetch', fetchMock)

    await new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST)

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/indicator-calculations', {
      method: 'POST',
      body: {
        symbol: 'BTCUSDT',
        aggregationInterval: '5m',
        candleCount: 3,
        resultType: 'float',
        script: REQUEST.script,
      },
    })
  })

  it('送出的指標值種類就是這次挑的那一種', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT', usedCandleCount: 3, resultType: 'boolList', values: {},
    })
    vi.stubGlobal('$fetch', fetchMock)

    await new IndicatorCalculationProxy(BASE_URL).calculateIndicator(requestOf('boolList'))

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/indicator-calculations',
      expect.objectContaining({ body: expect.objectContaining({ resultType: 'boolList' }) }))
  })

  it('把回來的指標攤成一組名稱與值', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT',
      usedCandleCount: 4,
      resultType: 'float',
      values: { 均價: 110, 最高: 120 },
    }))

    const indicatorCalculation = await new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST)

    expect(indicatorCalculation.usedCandleCount).toBe(4)
    expect(indicatorCalculation.resultType).toBe('float')
    expect(indicatorCalculation.indicatorValues).toHaveLength(2)
    expect(indicatorCalculation.indicatorValues.map(indicatorValue => indicatorValue.name).sort())
      .toEqual(['均價', '最高'])
  })

  it.each([
    { description: '一個數字', resultType: 'float', wireValue: 110, expectedItems: [110] },
    {
      description: '一串數字', resultType: 'floatList',
      wireValue: [100, 105, 110], expectedItems: [100, 105, 110],
    },
    { description: '一個是非', resultType: 'bool', wireValue: true, expectedItems: [true] },
    {
      description: '一串是非', resultType: 'boolList',
      wireValue: [true, false], expectedItems: [true, false],
    },
    { description: '空的一串', resultType: 'floatList', wireValue: [], expectedItems: [] },
  ])('$description 的值都收成同一種形狀', async ({ resultType, wireValue, expectedItems }) => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT', usedCandleCount: 3, resultType, values: { 指標: wireValue },
    }))

    const indicatorCalculation = await new IndicatorCalculationProxy(BASE_URL)
      .calculateIndicator(requestOf(resultType))

    expect(indicatorCalculation.resultType).toBe(resultType)
    expect(indicatorCalculation.indicatorValues[0]?.items).toEqual(expectedItems)
  })

  it.each([
    { description: '回傳空的一組指標', values: {} },
    { description: '整個沒有指標這一段', values: null },
  ])('$description 時仍是一次成功的計算', async ({ values }) => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT', usedCandleCount: 3, resultType: 'float', values,
    }))

    const indicatorCalculation = await new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST)

    expect(indicatorCalculation.indicatorValues).toHaveLength(0)
    expect(indicatorCalculation.usedCandleCount).toBe(3)
  })

  it('算式跑不起來時，翻譯成「算式的問題」', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 422, message: '算式無法解讀：expected }, found EOF' })))

    const calculate = new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST)

    await expect(calculate).rejects.toBeInstanceOf(IndicatorScriptFailedError)
    await expect(new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST))
      .rejects.toThrow('算式無法解讀：expected }, found EOF')
  })

  it('請求本身有問題時，維持一般的拒絕', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 400, message: 'K 線不足，排除最新一根後目前可用 9 根，但要求 30 根' })))

    const calculate = new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST)

    await expect(calculate).rejects.toBeInstanceOf(BackendRequestRejectedError)
    await expect(new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST))
      .rejects.toThrow('K 線不足，排除最新一根後目前可用 9 根，但要求 30 根')
  })

  it('連不上後端時維持連線錯誤', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({})))

    await expect(new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST))
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })
})

describe('IndicatorCalculationProxy：算到哪一刻與讀了哪幾根', () => {
  it('沒指定算到哪一刻時就不送它——省略等同算到現在，不必送一個假的現在', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT', interval: '5m', usedCandleCount: 3, openTimes: [], resultType: 'float', values: {},
    })
    vi.stubGlobal('$fetch', fetchMock)

    await new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST)

    const [, options] = fetchMock.mock.calls[0] as [string, { body: Record<string, unknown> }]
    expect('endTime' in options.body).toBe(false)
  })

  it('指定了算到哪一刻就送出去', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT', interval: '1h', usedCandleCount: 3, openTimes: [], resultType: 'float', values: {},
    })
    vi.stubGlobal('$fetch', fetchMock)
    const endTime = new Date('2026-09-02T12:00:00.000Z')

    await new IndicatorCalculationProxy(BASE_URL).calculateIndicator(
      new IndicatorCalculationRequestDomain(
        new IndicatorCalculationRequestDto('BTCUSDT', '1h', 3, SCRIPT_BODY, 'float', [], endTime)))

    const [, options] = fetchMock.mock.calls[0] as [string, { body: Record<string, unknown> }]
    expect(options.body.endTime).toBe('2026-09-02T12:00:00.000Z')
  })

  it('把這次讀了哪幾根收成時間', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT',
      interval: '1h',
      usedCandleCount: 2,
      openTimes: ['2026-09-02T10:00:00Z', '2026-09-02T11:00:00Z'],
      resultType: 'floatList',
      values: { 線: [1, 2] },
    }))

    const calculation = await new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST)

    expect(calculation.openTimes).toEqual([
      new Date('2026-09-02T10:00:00Z'), new Date('2026-09-02T11:00:00Z'),
    ])
  })

  it('沒回這次讀了哪幾根時是空的，不是壞掉', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT', interval: '5m', usedCandleCount: 3, openTimes: null, resultType: 'float', values: {},
    }))

    const calculation = await new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST)

    expect(calculation.openTimes).toEqual([])
  })
})

describe('名字對不上與算式跑不動是兩件事', () => {
  // 把參數改了名卻忘了改算式，是很容易犯、而且完全看不出來的錯。
  // 把它說成「算式壞了」，人會盯著一段其實沒有問題的程式碼看很久。
  it('回應帶了參數名稱時，說的是那個名字對不上', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      rejectionOf(400, '算式取用了參數 "期數"，但這一次沒有宣告這個名字', '期數')))

    const failure = await calculationFailure()

    expect(failure).toBeInstanceOf(StrategyParameterNotDeclaredError)
    expect((failure as StrategyParameterNotDeclaredError).parameterName).toBe('期數')
    expect(failure).not.toBeInstanceOf(IndicatorScriptFailedError)
  })

  it('沒帶參數名稱的那些拒絕照舊', async () => {
    // 辨識靠的是那個欄位，不是訊息的文字——文字是寫給人看的，改一個字就不該讓程式壞掉。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      rejectionOf(422, '算式執行失敗：index out of range')))

    const failure = await calculationFailure()

    expect(failure).toBeInstanceOf(IndicatorScriptFailedError)
    expect(failure).not.toBeInstanceOf(StrategyParameterNotDeclaredError)
  })

  it('訊息裡剛好提到參數兩個字也不會被誤認', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      rejectionOf(400, '參數看起來怪怪的，但這一則沒有指名任何一個')))

    const failure = await calculationFailure()

    expect(failure).not.toBeInstanceOf(StrategyParameterNotDeclaredError)
  })
})

/** 後端拒絕時 $fetch 丟出來的形狀。 */
function rejectionOf(status: number, message: string, parameterName?: string) {
  return Object.assign(new Error(message), {
    response: { status },
    data: parameterName === undefined ? { message } : { message, parameterName },
  })
}

async function calculationFailure(): Promise<unknown> {
  try {
    await new IndicatorCalculationProxy(BASE_URL).calculateIndicator(
      new IndicatorCalculationRequestDomain(
        new IndicatorCalculationRequestDto('BTCUSDT', '5m', 3, SCRIPT_BODY, 'float')))
  }
  catch (error: unknown) {
    return error
  }

  throw new Error('這次計算應該要失敗才對')
}
