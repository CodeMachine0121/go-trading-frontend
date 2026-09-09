import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import { ObservationWindowVo } from '~/domain/models/vo/observation-window-vo'
import { IndicatorCalculationService } from '~/domain/service/indicator-calculation-service'
import { StrategyParameterDto, STRATEGY_PARAMETER_KINDS } from '~/domain/models/dto/strategy-parameter-dto'
import { IndicatorCalculationFieldError } from '~/domain/errors/indicator-calculation-field-error'
import { CalculationSpanDto } from '~/domain/models/dto/calculation-span-dto'

/** 要看的那一段。這一份測試不關心它多長，只關心它原封不動地到達邊界。 */
const OBSERVATION_WINDOW = new ObservationWindowVo(
  new Date('2026-09-03T09:00:00.000Z'), null)

const SCRIPT_BODY = [
  'func Calculate(data []indicator.KCandle) map[string]float64 {',
  '\treturn map[string]float64{"均價": 110}',
  '}',
].join('\n')

function buildProxy(
  indicatorCalculation = new IndicatorCalculation('BTCUSDT', '5m', 3, 'float', []),
): IIndicatorCalculationProxy {
  return { calculateIndicator: vi.fn().mockResolvedValue(indicatorCalculation) }
}

describe('IndicatorCalculationService', () => {
  it('把驗證過的請求交出去，並回傳排好序的結果', async () => {
    const indicatorCalculationProxy = buildProxy(new IndicatorCalculation('BTCUSDT', '5m', 3, 'float', [
      new IndicatorValueVo('最高', [120]),
      new IndicatorValueVo('均價', [110]),
    ]))
    const indicatorCalculationService = new IndicatorCalculationService(indicatorCalculationProxy)

    const resultDto = await indicatorCalculationService.calculateIndicator(
      new IndicatorCalculationRequestDto('BTCUSDT', '5m', OBSERVATION_WINDOW, SCRIPT_BODY, 'float'))

    expect(indicatorCalculationProxy.calculateIndicator).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'BTCUSDT',
        observationWindow: OBSERVATION_WINDOW,
        script: expect.stringContaining('func Calculate(data []indicator.KCandle) map[string]float64 {'),
      }))
    expect(resultDto.usedCandleCount).toBe(3)
    expect(resultDto.indicatorValues.map(indicatorValue => indicatorValue.name))
      .toEqual(['均價', '最高'])
  })

  it('交出去的算式是固定外框加上使用者寫的檔案主體', async () => {
    const indicatorCalculationProxy = buildProxy()
    const indicatorCalculationService = new IndicatorCalculationService(indicatorCalculationProxy)

    await indicatorCalculationService.calculateIndicator(
      new IndicatorCalculationRequestDto('BTCUSDT', '5m', OBSERVATION_WINDOW, SCRIPT_BODY, 'boolList'))

    expect(indicatorCalculationProxy.calculateIndicator).toHaveBeenCalledWith(
      expect.objectContaining({
        script: expect.stringContaining(`)\n\n${SCRIPT_BODY}`),
      }))
  })

  it('輸入不合法時完全不去執行計算', async () => {
    const indicatorCalculationProxy = buildProxy()
    const indicatorCalculationService = new IndicatorCalculationService(indicatorCalculationProxy)

    await expect(indicatorCalculationService.calculateIndicator(
      new IndicatorCalculationRequestDto('', '5m', OBSERVATION_WINDOW, SCRIPT_BODY, 'float'),
    )).rejects.toBeInstanceOf(IndicatorCalculationFieldError)
    expect(indicatorCalculationProxy.calculateIndicator).not.toHaveBeenCalled()
  })

  it.each([
    { resultType: 'float', valueShape: 'map[string]float64' },
    { resultType: 'floatList', valueShape: 'map[string][]float64' },
    { resultType: 'bool', valueShape: 'map[string]bool' },
    { resultType: 'boolList', valueShape: 'map[string][]bool' },
  ])('$resultType 的算式樣板：外框固定，範例主體與空白 stub 帶對應的簽章', ({ resultType, valueShape }) => {
    const templateDto = new IndicatorCalculationService(buildProxy())
      .describeIndicatorScript(resultType)

    expect(templateDto.frameHeader).toBe('package main\n\nimport (\n\t"indicator"\n\t"math"\n\t"sort"\n)')
    expect(templateDto.exampleBody)
      .toContain(`func Calculate(data []indicator.KCandle) ${valueShape} {`)
    expect(templateDto.exampleBody).toContain(`return ${valueShape}{`)
    expect(templateDto.blankBody)
      .toBe(`func Calculate(data []indicator.KCandle) ${valueShape} {\n\t\n}`)
  })

  it('改指標值種類：把第一個 Calculate 的回傳型別換成新選的', () => {
    const service = new IndicatorCalculationService(buildProxy())
    const body = 'func Calculate(data []indicator.KCandle) map[string]float64 {\n\treturn nil\n}'

    expect(service.retargetScriptReturnType(body, 'signal'))
      .toBe('func Calculate(data []indicator.KCandle) indicator.Signal {\n\treturn nil\n}')
  })

  it('沒有特別挑時算的是一個數字', () => {
    expect(new IndicatorCalculationService(buildProxy()).defaultResultType()).toBe('float')
  })

  it('可以挑的指標值種類就是那五種，帶著給人看的名字', () => {
    const optionDtos = new IndicatorCalculationService(buildProxy()).listResultTypeOptions()

    expect(optionDtos.map(optionDto => optionDto.value))
      .toEqual(['float', 'floatList', 'bool', 'boolList', 'signal'])
    expect(optionDtos.map(optionDto => optionDto.label))
      .toEqual(['一個數字', '一串數字', '一個是非', '一串是非', '一個信號'])
  })

  it('信號種類的算式樣板：範例主體回傳一個信號，用系統提供的方式選一個', () => {
    const templateDto = new IndicatorCalculationService(buildProxy()).describeIndicatorScript('signal')

    expect(templateDto.frameHeader).not.toContain('func Calculate')
    expect(templateDto.exampleBody)
      .toContain('func Calculate(data []indicator.KCandle) indicator.Signal {')
    expect(templateDto.exampleBody).toContain('\treturn indicator.Buy')
    expect(templateDto.exampleBody).not.toContain('map[string]')
    expect(templateDto.blankBody)
      .toBe('func Calculate(data []indicator.KCandle) indicator.Signal {\n\t\n}')
  })

  it('說得出「一個信號」種類的算式能回傳哪三個值', () => {
    const readings = new IndicatorCalculationService(buildProxy()).listSignalReadings()

    expect(readings.map(reading => reading.value))
      .toEqual(['return indicator.Buy', 'return indicator.Sell', 'return indicator.Hold'])
    expect(readings.map(reading => reading.meaning)).toEqual(['買入', '賣出', '持有，倉位不動'])
  })
})

describe('IndicatorCalculationService 交出的 K 線欄位說明', () => {
  it('列出算式收到的每一個欄位，順序與 K 線瀏覽那張表一致', () => {
    const indicatorCalculationService = new IndicatorCalculationService(buildProxy())

    const fields = indicatorCalculationService.listKCandleFields()

    expect(fields.map(field => field.name)).toEqual([
      'Symbol', 'OpenTimeUnixSeconds', 'Open', 'High', 'Low', 'Close',
      'Volume', 'QuoteVolume', 'TakerBuyBaseVolume', 'TakerBuyQuoteVolume',
    ])
  })

  it.each([
    // 說明的是**沙箱裡**那個型別，不是資料庫那張表——三個差異都是最容易寫錯的地方。
    { name: 'OpenTimeUnixSeconds', type: 'int64', 為什麼: '沙箱沒有 time 可以匯入，時間以 Unix 秒交給算式' },
    { name: 'Close', type: 'float64', 為什麼: '算式做純運算，價量不是 decimal' },
    { name: 'Symbol', type: 'string', 為什麼: '交易標的照樣看得到' },
  ])('$name 的型別是 $type（$為什麼）', ({ name, type }) => {
    const indicatorCalculationService = new IndicatorCalculationService(buildProxy())

    const field = indicatorCalculationService.listKCandleFields()
      .find(candidate => candidate.name === name)

    expect(field?.type).toBe(type)
  })

  it('不列出資料庫那張表才有的東西——算式看不到它', () => {
    const indicatorCalculationService = new IndicatorCalculationService(buildProxy())

    const fields = indicatorCalculationService.listKCandleFields()

    expect(fields.map(field => field.name)).not.toContain('ID')
    // 表上是 time.Time，沙箱裡不是，所以那個名字在算式裡寫不出來。
    expect(fields.map(field => field.name)).not.toContain('OpenTime')
  })

  it('每一個欄位都帶一個給人看的名字', () => {
    const indicatorCalculationService = new IndicatorCalculationService(buildProxy())

    const fields = indicatorCalculationService.listKCandleFields()

    expect(fields.every(field => field.label.trim() !== '')).toBe(true)
    expect(fields.find(field => field.name === 'Close')?.label).toBe('收盤價')
  })
})

describe('IndicatorCalculationService 的執行設定', () => {
  it('六種彙總刻度都在，由細到粗，帶中文名字', () => {
    const options = new IndicatorCalculationService(buildProxy())
      .listAggregationIntervalOptions()

    expect(options.map(option => option.value)).toEqual(['1m', '5m', '15m', '1h', '4h', '1d'])
    expect(options.map(option => option.label))
      .toEqual(['一分鐘', '五分鐘', '十五分鐘', '一小時', '四小時', '一天'])
  })

  it('沒特別挑時是一分鐘', () => {
    expect(new IndicatorCalculationService(buildProxy()).defaultAggregationInterval()).toBe('1m')
  })

  it('挑好的彙總刻度真的被送出去執行', async () => {
    // 這個欄位曾經只被記下來、計算完全不理它。它現在會到達邊界。
    const indicatorCalculationProxy = buildProxy()

    await new IndicatorCalculationService(indicatorCalculationProxy).calculateIndicator(
      new IndicatorCalculationRequestDto('BTCUSDT', '1h', OBSERVATION_WINDOW, SCRIPT_BODY, 'float'))

    expect(indicatorCalculationProxy.calculateIndicator).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregationInterval: expect.objectContaining({ value: '1h' }),
        observationWindow: OBSERVATION_WINDOW,
      }))
  })

  it('結果說出的是後端回報的刻度，不是送出時挑的那一個', async () => {
    // 挑了一小時卻用五分鐘算出來的數字長得跟對的一模一樣。
    // 照回報的呈現，這種錯才看得見。
    const indicatorCalculationProxy = buildProxy(
      new IndicatorCalculation('BTCUSDT', '5m', 3, 'float', []))

    const resultDto = await new IndicatorCalculationService(indicatorCalculationProxy)
      .calculateIndicator(
        new IndicatorCalculationRequestDto('BTCUSDT', '1h', OBSERVATION_WINDOW, SCRIPT_BODY, 'float'))

    expect(resultDto.intervalLabel).toBe('五分鐘')
  })

  it('一個指標都沒算出來時照樣說得出這次用的刻度', async () => {
    const indicatorCalculationProxy = buildProxy(
      new IndicatorCalculation('BTCUSDT', '1h', 24, 'float', []))

    const resultDto = await new IndicatorCalculationService(indicatorCalculationProxy)
      .calculateIndicator(
        new IndicatorCalculationRequestDto('BTCUSDT', '1h', OBSERVATION_WINDOW, SCRIPT_BODY, 'float'))

    expect(resultDto.isEmpty).toBe(true)
    expect(resultDto.intervalLabel).toBe('一小時')
  })
})

describe('IndicatorCalculationService：改一個不存在的第幾列', () => {
  // 畫面只會交出它自己畫得出來的列號，所以這條路平常走不到。
  // 但「整份原封不動」與「拋錯」對使用者是兩件完全不同的事，值得釘住。
  const 期數 = new StrategyParameterDto('期數', 'lookbackCount', 20)

  it.each([
    { changed: '改名', change: (service: IndicatorCalculationService) =>
      service.renameStrategyParameter([期數], 9, '週期') },
    { changed: '改種類', change: (service: IndicatorCalculationService) =>
      service.changeStrategyParameterKind([期數], 9, 'number') },
    { changed: '改值', change: (service: IndicatorCalculationService) =>
      service.changeStrategyParameterValue([期數], 9, 50) },
  ])('$changed 第九列時整份原封不動', ({ change }) => {
    expect(change(new IndicatorCalculationService(buildProxy()))).toEqual([期數])
  })
})

describe('IndicatorCalculationService：宣告好的參數在算式裡怎麼讀', () => {
  // 這一份與 K 線欄位那一份是同一件事的兩半——兩者描述的都是沙箱交給算式的東西。
  // 它住在領域而不是畫面，理由也相同：那些字一旦散在畫面上，
  // 系統那一側改了注入的函式名時，沒有人會知道要回頭改它們。
  const accesses = new IndicatorCalculationService(buildProxy()).listScriptParameterAccesses()

  it('選單上挑得到的就是可宣告的每一種，一種都不少', () => {
    // 少一種就是那一種存得進去卻挑不出來——而漏掉一個列舉點正是這個切片犯過的錯。
    expect(new IndicatorCalculationService(buildProxy()).listStrategyParameterKindOptions()
      .map(option => option.value)).toEqual([...STRATEGY_PARAMETER_KINDS])
  })

  it('每一種可宣告的種類都有一則，一則都不少', () => {
    // 少一則就是一種讀法沒有人說得出來，而那一種在選單上挑得到。
    expect(accesses.map(access => access.kindLabel))
      .toEqual(new IndicatorCalculationService(buildProxy()).listStrategyParameterKindOptions()
        .map(option => option.label))
  })

  it.each([
    { kindLabel: '回看根數', call: 'indicator.LookbackCount(', returnType: 'int' },
    { kindLabel: '數值', call: 'indicator.Number(', returnType: 'float64' },
    { kindLabel: '是非', call: 'indicator.Boolean(', returnType: 'bool' },
  ])('$kindLabel 讀出來是 $returnType', ({ kindLabel, call, returnType }) => {
    // 三種讀出來的型別不同，而那正是分種類的理由：回看根數幾乎總是拿去切片
    // （Go 不讓浮點數當索引），是非要直接寫進 if。
    const access = accesses.find(candidate => candidate.kindLabel === kindLabel)

    expect(access?.example).toContain(call)
    expect(access?.returnType).toBe(returnType)
  })

  it.each([
    { kindLabel: '回看根數', secondLine: 'data[len(data)-period:]' },
    { kindLabel: '數值', secondLine: '.Close * (1 + factor)' },
    { kindLabel: '是非', secondLine: 'if strictly &&' },
  ])('$kindLabel 的範例還說出讀出來之後拿它做什麼', ({ kindLabel, secondLine }) => {
    // 一個孤零零的函式簽章答不出「然後呢」。第二行才是會卡住的地方——
    // 回看根數拿去切片（而那正是它必須是整數的原因），數值拿去跟價格算。
    const access = accesses.find(candidate => candidate.kindLabel === kindLabel)

    expect(access?.example).toContain(secondLine)
    expect(access?.example.split('\n')).toHaveLength(2)
  })
})

// 使用者說得出口的是「最近兩小時」。畫面把它交給領域換算，因為「多長才算合理」是規則。
describe('IndicatorCalculationService：「要看多長」是哪一段行情', () => {
  const NOW = new Date('2026-09-03T12:00:00.000Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function windowFor(amount: number, unit: 'minute' | 'hour' | 'day') {
    return new IndicatorCalculationService(buildProxy())
      .observationWindowFor(new CalculationSpanDto(amount, unit))
  }

  it.each([
    { name: '最近兩小時', amount: 2, unit: 'hour' as const, expectedStart: '2026-09-03T10:00:00.000Z' },
    { name: '最近三十分鐘', amount: 30, unit: 'minute' as const, expectedStart: '2026-09-03T11:30:00.000Z' },
    { name: '最近一天', amount: 1, unit: 'day' as const, expectedStart: '2026-09-02T12:00:00.000Z' },
  ])('$name 是從現在往回推的那一段', ({ amount, unit, expectedStart }) => {
    expect(windowFor(amount, unit).startTime).toEqual(new Date(expectedStart))
  })

  it('終點不指定——「最近」的右端就是現在,交給系統判斷', () => {
    expect(windowFor(2, 'hour').endTime).toBeNull()
  })

  it.each([
    { name: '零', amount: 0 },
    { name: '負數', amount: -3 },
    { name: '小數', amount: 2.5 },
  ])('$name 時擋在那一格旁邊,不換算成任何一段', ({ amount }) => {
    // 規則不住在畫面上：畫面問這個而不是自己判斷多長才算合理。
    expect(() => windowFor(amount, 'hour')).toThrowError(IndicatorCalculationFieldError)
    try {
      windowFor(amount, 'hour')
    }
    catch (error: unknown) {
      expect((error as IndicatorCalculationFieldError).field).toBe('span')
    }
  })
})
