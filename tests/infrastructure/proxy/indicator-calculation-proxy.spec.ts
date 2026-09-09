import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IndicatorCalculationProxy } from '~/infrastructure/proxy/indicator-calculation-proxy'
import { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'
import { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'
import { StrategyParameterNotDeclaredError } from '~/domain/errors/strategy-parameter-not-declared-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { IndicatorCalculationFieldError } from '~/domain/errors/indicator-calculation-field-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { ObservationWindowVo } from '~/domain/models/vo/observation-window-vo'

const BASE_URL = 'http://localhost:8080'
const SCRIPT_BODY = 'return map[string]float64{"均價": 110}'
/** 要看的那一段，終點不指定——大部分案例問的是「到現在為止」。 */
const OBSERVATION_WINDOW = new ObservationWindowVo(
  new Date('2026-09-02T09:00:00.000Z'), null)
const REQUEST = new IndicatorCalculationRequestDomain(
  new IndicatorCalculationRequestDto('BTCUSDT', '5m', OBSERVATION_WINDOW, SCRIPT_BODY, 'float'))

function requestOf(resultType: string): IndicatorCalculationRequestDomain {
  return new IndicatorCalculationRequestDomain(
    new IndicatorCalculationRequestDto('BTCUSDT', '5m', OBSERVATION_WINDOW, SCRIPT_BODY, resultType))
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
        startTime: '2026-09-02T09:00:00.000Z',
        resultType: 'float',
        script: REQUEST.script,
        parameters: [],
        parameterValues: [],
      },
    })
  })

  it('宣告的旋鈕與這一次的值都送出去——少了它們，算式取用時會說名字沒有宣告', async () => {
    // 這條測試是後來補的，補的原因是它漏掉的那一格造成了一個真的失敗：
    // 參數在畫面上宣告好了、也傳到了 proxy，卻沒有進到送出去的 body，
    // 於是每一次計算後端都收到零個參數，而腳本裡**第一個**取用參數的那一行失敗。
    // 被指名的因此是「腳本先用到的那一個」，看起來像宣告順序有影響——其實沒有。
    const fetchMock = vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT', usedCandleCount: 3, resultType: 'float', values: {},
    })
    vi.stubGlobal('$fetch', fetchMock)

    await new IndicatorCalculationProxy(BASE_URL).calculateIndicator(
      new IndicatorCalculationRequestDomain(new IndicatorCalculationRequestDto(
        'BTCUSDT', '5m', OBSERVATION_WINDOW, SCRIPT_BODY, 'float', [
          new StrategyParameterDto('期數', 'lookbackCount', 20),
          new StrategyParameterDto('倍數', 'number', 1.5),
          new StrategyParameterDto('只看多方', 'boolean', 0),
        ])))

    const body = fetchMock.mock.calls[0]![1].body
    expect(body.parameters).toEqual([
      { name: '期數', kind: 'lookbackCount', defaultValue: 20 },
      { name: '倍數', kind: 'number', defaultValue: 1.5 },
      // 是非在這條路上就是一個數字，跟另外兩種一模一樣——這正是分種類只分「讀法」的意義。
      { name: '只看多方', kind: 'boolean', defaultValue: 0 },
    ])
    expect(body.parameterValues).toEqual([
      { name: '期數', value: 20 },
      { name: '倍數', value: 1.5 },
      { name: '只看多方', value: 0 },
    ])
  })

  it('一個旋鈕都沒宣告時送出空的兩份，而不是整個欄位不見', async () => {
    // 「沒有宣告任何旋鈕」與「忘了送」在收的那一端長得一模一樣，
    // 所以永遠送出一份清單——空的也是一個答案。
    const fetchMock = vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT', usedCandleCount: 3, resultType: 'float', values: {},
    })
    vi.stubGlobal('$fetch', fetchMock)

    await new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST)

    const body = fetchMock.mock.calls[0]![1].body
    expect(body.parameters).toEqual([])
    expect(body.parameterValues).toEqual([])
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

  it('信號種類的回應：把那一個信號帶進 entity，沒有指標名稱', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT',
      usedCandleCount: 4,
      resultType: 'signal',
      values: null,
      signal: 'sell',
    }))

    const indicatorCalculation = await new IndicatorCalculationProxy(BASE_URL)
      .calculateIndicator(requestOf('signal'))

    expect(indicatorCalculation.resultType).toBe('signal')
    expect(indicatorCalculation.signal).toBe('sell')
    expect(indicatorCalculation.indicatorValues).toHaveLength(0)
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
    // 一則指不出哪一格的拒絕：既沒帶那兩個根數，也沒指名欄位，所以它照原樣轉達。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 400, message: '找不到這個交易標的' })))

    const calculate = new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST)

    await expect(calculate).rejects.toBeInstanceOf(BackendRequestRejectedError)
    await expect(new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST))
      .rejects.toThrow('找不到這個交易標的')
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
    const windowEndingInThePast = new ObservationWindowVo(
      new Date('2026-09-02T09:00:00.000Z'), new Date('2026-09-02T12:00:00.000Z'))

    await new IndicatorCalculationProxy(BASE_URL).calculateIndicator(
      new IndicatorCalculationRequestDomain(new IndicatorCalculationRequestDto(
        'BTCUSDT', '1h', windowEndingInThePast, SCRIPT_BODY, 'float')))

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
      rejectionOf(400, '算式取用了參數 "期數"，但這一次沒有宣告這個名字',
        { parameterName: '期數' })))

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
describe('要的太多了：這一則要落在使用者改得動的那一格旁邊', () => {
  it('系統指名是那一段的起點時，說的是「要看多長」的問題，並給出兩條出路', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(
      400,
      '這一段配上回看根數要用到 105120 根，超過單次可用的最大根數（最多 1000 根）',
      { field: 'startTime' })))

    const failure = await calculationFailure()

    // 系統指名的是「要看哪一段的起點」——那是它的說法；這個畫面把同一件事畫成「要看多長」。
    // 這個判準換過一次名字（曾經是根數）；漏改的話這一句不會消失，只會從欄位旁邊掉下來。
    expect(failure).toBeInstanceOf(IndicatorCalculationFieldError)
    expect((failure as IndicatorCalculationFieldError).field).toBe('span')
    expect((failure as Error).message).toContain('超過單次可用的最大根數')
    expect((failure as Error).message).toContain('縮短')
    expect((failure as Error).message).toContain('粗一點')
    // 也不能提到相反的那個方向。兩種根數不足都調得動同一個旋鈕，所以一句話裡
    // 同時出現兩個方向，等於沒有指出方向——使用者會挑錯的那一邊試。
    expect((failure as Error).message).not.toContain('拉近')
    expect((failure as Error).message).not.toContain('細')
  })

  it('沒有指名任何一格的拒絕照舊，不會被說成是哪一格的問題', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      rejectionOf(400, '這一段沒有足夠的 K 線')))

    const failure = await calculationFailure()

    expect(failure).not.toBeInstanceOf(IndicatorCalculationFieldError)
    expect(failure).toBeInstanceOf(BackendRequestRejectedError)
  })
})

describe('填滿要幾根', () => {
  it('照系統說的收下來', () => {
    // 這個數字不能自己推算：那條式子（格數 ＋ 最大回看根數 − 1）是系統的規則，
    // 抄一份到這裡，兩邊哪天算得不一樣時說出來的話會安靜地錯。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT', requiredCandleCount: 119, usedCandleCount: 50,
      resultType: 'float', values: {},
    }))

    return expect(new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST))
      .resolves.toMatchObject({ candleCount: 119, usedCandleCount: 50 })
  })

  it('系統沒說的時候是「沒說」，不是零', () => {
    // 舊版的系統不回這一項。收成 0 會讓「沒說」看起來像「填滿要 0 根」，
    // 而後者會讓畫面說出一句它沒有依據的話。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT', usedCandleCount: 50, resultType: 'float', values: {},
    }))

    return expect(new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST))
      .resolves.toMatchObject({ candleCount: null })
  })
})

describe('走完的刻度區間連一個值都湊不出來', () => {
  it('翻成標在「要看多長」旁邊的說明，並說出那兩個數字', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(400, '湊不出來',
      { availableCandleCount: 19, minimumCandleCount: 20 })))

    const failure = await calculationFailure()

    expect(failure).toBeInstanceOf(IndicatorCalculationFieldError)
    expect((failure as IndicatorCalculationFieldError).field).toBe('span')
    expect((failure as Error).message).toContain('19')
    expect((failure as Error).message).toContain('20')
  })

  it('出路與「要得太多」那一句相反', async () => {
    // 兩者都是「根數不足」，但一個要更細的刻度、一個要更粗的。
    // 講成同一句，使用者會照著往錯的方向調。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(400, '湊不出來',
      { availableCandleCount: 19, minimumCandleCount: 20 })))

    const failure = await calculationFailure()

    expect((failure as Error).message).toContain('更細的彙總刻度')
    expect((failure as Error).message).not.toContain('縮短')
  })

  it('只帶半組數字時不當成這一種——半組說不出那句話', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(400, '某種拒絕',
      { availableCandleCount: 19 })))

    const failure = await calculationFailure()

    expect(failure).not.toBeInstanceOf(IndicatorCalculationFieldError)
    expect(failure).toBeInstanceOf(BackendRequestRejectedError)
  })
})

function rejectionOf(
  status: number,
  message: string,
  named?: {
    parameterName?: string
    field?: string
    availableCandleCount?: number
    minimumCandleCount?: number
    observationWindowHoldsNoTrading?: boolean
  },
) {
  return Object.assign(new Error(message), {
    response: { status },
    data: { message, ...named },
  })
}

async function calculationFailure(): Promise<unknown> {
  try {
    await new IndicatorCalculationProxy(BASE_URL).calculateIndicator(
      new IndicatorCalculationRequestDomain(
        new IndicatorCalculationRequestDto('BTCUSDT', '5m', OBSERVATION_WINDOW, SCRIPT_BODY, 'float')))
  }
  catch (error: unknown) {
    return error
  }

  throw new Error('這次計算應該要失敗才對')
}

// 第三種算不出來。它與另外兩種的差別不在嚴重程度，在**出路的方向**：
// 那兩種都是「調某個數字」，這一種調什麼都沒有用——週六不會長出成交。
describe('這一段時間市場沒有交易：第三種算不出來', () => {
  it('系統說這一段沒有交易時，那一句落在「要看多長」旁邊', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(
      400,
      '要看的這一段時間裡，taiwanStock 沒有交易',
      { observationWindowHoldsNoTrading: true })))

    const failure = await calculationFailure()

    expect(failure).toBeInstanceOf(IndicatorCalculationFieldError)
    expect((failure as IndicatorCalculationFieldError).field).toBe('span')
    expect((failure as Error).message).toContain('這一段時間市場沒有交易')
    expect((failure as Error).message).toContain('有交易的時間')
  })

  it('那句話不指向另外兩種的出路——調了也沒有用', async () => {
    // 換刻度、縮短或拉長區間都不會讓週六長出成交。三句話共用一個動詞，
    // 使用者就會照著去調一個調得動、但一點用都沒有的地方。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(
      400, '要看的這一段時間裡沒有交易', { observationWindowHoldsNoTrading: true })))

    const message = ((await calculationFailure()) as Error).message

    expect(message).not.toContain('刻度')
    expect(message).not.toContain('縮短')
    expect(message).not.toContain('拉長')
    expect(message).not.toContain('補')
  })

  it('沒帶那個值的拒絕不會被誤認成這一種', async () => {
    // 辨識靠的是系統交出來的那個值，不是訊息的文字。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(
      400, '這一段時間市場沒有交易——但這一則沒有指名它是哪一種')))

    const failure = await calculationFailure()

    expect((failure as Error).message).not.toContain('有交易的時間')
  })

  it('它與「湊不出最少可算根數」分得開', async () => {
    // 兩者的出路正好相反：那一種要更細的刻度或補歷史，這一種兩條都沒有用。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(
      400, '要看的這一段時間裡沒有交易', { observationWindowHoldsNoTrading: true })))

    const message = ((await calculationFailure()) as Error).message

    expect(message).not.toContain('至少要')
  })
})
