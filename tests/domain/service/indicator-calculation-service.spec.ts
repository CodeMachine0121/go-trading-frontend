import { describe, expect, it, vi } from 'vitest'
import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import { IndicatorCalculationService } from '~/domain/service/indicator-calculation-service'
import { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'
import { IndicatorCalculationFieldError } from '~/domain/errors/indicator-calculation-field-error'

const SCRIPT_BODY = 'return map[string]float64{"均價": 110}'

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
      new IndicatorCalculationRequestDto('BTCUSDT', '5m', 3, SCRIPT_BODY, 'float'))

    expect(indicatorCalculationProxy.calculateIndicator).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'BTCUSDT',
        candleCount: 3,
        script: expect.stringContaining('func Calculate(data []indicator.KCandle) map[string]float64 {'),
      }))
    expect(resultDto.usedCandleCount).toBe(3)
    expect(resultDto.indicatorValues.map(indicatorValue => indicatorValue.name))
      .toEqual(['均價', '最高'])
  })

  it('交出去的算式是外框加上使用者寫的內容', async () => {
    const indicatorCalculationProxy = buildProxy()
    const indicatorCalculationService = new IndicatorCalculationService(indicatorCalculationProxy)

    await indicatorCalculationService.calculateIndicator(
      new IndicatorCalculationRequestDto('BTCUSDT', '5m', 3, SCRIPT_BODY, 'boolList'))

    expect(indicatorCalculationProxy.calculateIndicator).toHaveBeenCalledWith(
      expect.objectContaining({
        script: expect.stringContaining(`\t${SCRIPT_BODY}`),
      }))
  })

  it('輸入不合法時完全不去執行計算', async () => {
    const indicatorCalculationProxy = buildProxy()
    const indicatorCalculationService = new IndicatorCalculationService(indicatorCalculationProxy)

    await expect(indicatorCalculationService.calculateIndicator(
      new IndicatorCalculationRequestDto('', '5m', 3, SCRIPT_BODY, 'float'),
    )).rejects.toBeInstanceOf(IndicatorCalculationFieldError)
    expect(indicatorCalculationProxy.calculateIndicator).not.toHaveBeenCalled()
  })

  it.each([
    { resultType: 'float', valueShape: 'map[string]float64' },
    { resultType: 'floatList', valueShape: 'map[string][]float64' },
    { resultType: 'bool', valueShape: 'map[string]bool' },
    { resultType: 'boolList', valueShape: 'map[string][]bool' },
  ])('$resultType 的算式樣板：外框產出 $valueShape，範例內容跟著對', ({ resultType, valueShape }) => {
    const templateDto = new IndicatorCalculationService(buildProxy())
      .describeIndicatorScript(resultType)

    expect(templateDto.frameHeader).toContain(`func Calculate(data []indicator.KCandle) ${valueShape} {`)
    expect(templateDto.frameFooter).toBe('}')
    expect(templateDto.exampleBody).toContain(`return ${valueShape}{`)
    expect(templateDto.exampleBody).not.toContain('func Calculate')
  })

  it('沒有特別挑時算的是一個數字', () => {
    expect(new IndicatorCalculationService(buildProxy()).defaultResultType()).toBe('float')
  })

  it('可以挑的指標值種類就是那四種，帶著給人看的名字', () => {
    const optionDtos = new IndicatorCalculationService(buildProxy()).listResultTypeOptions()

    expect(optionDtos.map(optionDto => optionDto.value))
      .toEqual(['float', 'floatList', 'bool', 'boolList'])
    expect(optionDtos.map(optionDto => optionDto.label))
      .toEqual(['一個數字', '一串數字', '一個是非', '一串是非'])
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
  it('五種彙總刻度都在，由細到粗，帶中文名字', () => {
    const options = new IndicatorCalculationService(buildProxy())
      .listAggregationIntervalOptions()

    expect(options.map(option => option.value)).toEqual(['5m', '15m', '1h', '4h', '1d'])
    expect(options.map(option => option.label))
      .toEqual(['五分鐘', '十五分鐘', '一小時', '四小時', '一天'])
  })

  it('沒特別挑時是五分鐘', () => {
    expect(new IndicatorCalculationService(buildProxy()).defaultAggregationInterval()).toBe('5m')
  })

  it('挑好的彙總刻度真的被送出去執行', async () => {
    // 這個欄位曾經只被記下來、計算完全不理它。它現在會到達邊界。
    const indicatorCalculationProxy = buildProxy()

    await new IndicatorCalculationService(indicatorCalculationProxy).calculateIndicator(
      new IndicatorCalculationRequestDto('BTCUSDT', '1h', 24, SCRIPT_BODY, 'float'))

    expect(indicatorCalculationProxy.calculateIndicator).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregationInterval: expect.objectContaining({ value: '1h' }),
        candleCount: 24,
      }))
  })

  it('結果說出的是後端回報的刻度，不是送出時挑的那一個', async () => {
    // 挑了一小時卻用五分鐘算出來的數字長得跟對的一模一樣。
    // 照回報的呈現，這種錯才看得見。
    const indicatorCalculationProxy = buildProxy(
      new IndicatorCalculation('BTCUSDT', '5m', 3, 'float', []))

    const resultDto = await new IndicatorCalculationService(indicatorCalculationProxy)
      .calculateIndicator(
        new IndicatorCalculationRequestDto('BTCUSDT', '1h', 3, SCRIPT_BODY, 'float'))

    expect(resultDto.intervalLabel).toBe('五分鐘')
  })

  it('一個指標都沒算出來時照樣說得出這次用的刻度', async () => {
    const indicatorCalculationProxy = buildProxy(
      new IndicatorCalculation('BTCUSDT', '1h', 24, 'float', []))

    const resultDto = await new IndicatorCalculationService(indicatorCalculationProxy)
      .calculateIndicator(
        new IndicatorCalculationRequestDto('BTCUSDT', '1h', 24, SCRIPT_BODY, 'float'))

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
