import { describe, expect, it, vi } from 'vitest'
import { ChartIndicatorService } from '~/domain/service/chart-indicator-service'
import type { IChartLineColorPreferenceProxy } from '~/domain/interface/i-chart-line-color-preference-proxy'
import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import { ChartIndicatorRequestDto } from '~/domain/models/dto/chart-indicator-request-dto'
import { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'
import { StrategyDto } from '~/domain/models/dto/strategy-dto'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { DrawnChartLinesVo } from '~/domain/models/vo/drawn-chart-lines-vo'
import { AppliedIndicatorDto } from '~/domain/models/dto/applied-indicator-dto'
import type { IStrategyParameterValuePreferenceProxy } from '~/domain/interface/i-strategy-parameter-value-preference-proxy'
import type { IAppliedChartIndicatorPreferenceProxy } from '~/domain/interface/i-applied-chart-indicator-preference-proxy'
import { RememberedAppliedIndicatorVo } from '~/domain/models/vo/remembered-applied-indicator-vo'
import { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'

const CHART_END_TIME = new Date('2026-09-02T12:00:00.000Z')

function strategyOf(resultType = 'float'): StrategyDto {
  return new StrategyDto(
    7, '二十根均線', new StrategyContentDto('sum := 0.0', resultType), true, true)
}

/** 一次套用：預設沒有旋鈕，與這個切片之前的行為一模一樣。 */
function appliedIndicatorOf(strategy = strategyOf(), id = 1): AppliedIndicatorDto {
  return new AppliedIndicatorDto(id, strategy, strategy.content.parameters)
}

function requestOf(
  strategy = strategyOf(), takenColorTokens: string[] = [], drawnLineKeys: string[] = [],
): ChartIndicatorRequestDto {
  return new ChartIndicatorRequestDto(
    appliedIndicatorOf(strategy), 'BTCUSDT', '1h', 24, CHART_END_TIME,
    new DrawnChartLinesVo(takenColorTokens, drawnLineKeys))
}

function buildService(
  indicatorCalculation = new IndicatorCalculation(
    'BTCUSDT', '1h', 24, 'float', [new IndicatorValueVo('均價', [115])]),
  colorPreference: Partial<IChartLineColorPreferenceProxy> = {},
  parameterValuePreference: Partial<IStrategyParameterValuePreferenceProxy> = {},
  appliedIndicatorPreference: Partial<IAppliedChartIndicatorPreferenceProxy> = {},
) {
  const indicatorCalculationProxy: IIndicatorCalculationProxy = {
    calculateIndicator: vi.fn().mockResolvedValue(indicatorCalculation),
  }
  const chartLineColorPreferenceProxy: IChartLineColorPreferenceProxy = {
    readColorToken: vi.fn().mockReturnValue(null),
    writeColorToken: vi.fn(),
    ...colorPreference,
  }

  const strategyParameterValuePreferenceProxy: IStrategyParameterValuePreferenceProxy = {
    readValue: vi.fn().mockReturnValue(null),
    writeValue: vi.fn(),
    ...parameterValuePreference,
  }

  const appliedChartIndicatorPreferenceProxy: IAppliedChartIndicatorPreferenceProxy = {
    readAppliedChartIndicators: vi.fn().mockReturnValue([]),
    writeAppliedChartIndicators: vi.fn(),
    ...appliedIndicatorPreference,
  }

  return {
    chartIndicatorService: new ChartIndicatorService(
      indicatorCalculationProxy,
      chartLineColorPreferenceProxy,
      strategyParameterValuePreferenceProxy,
      appliedChartIndicatorPreferenceProxy),
    indicatorCalculationProxy,
    chartLineColorPreferenceProxy,
    strategyParameterValuePreferenceProxy,
    appliedChartIndicatorPreferenceProxy,
  }
}

describe('ChartIndicatorService.calculateChartIndicator', () => {
  it('拿圖上那批 K 線的每一個條件去算', async () => {
    // 少給任何一樣，算出來的都是另一段行情的指標，而它畫在圖上看起來完全正常。
    const fixture = buildService()

    await fixture.chartIndicatorService.calculateChartIndicator(requestOf())

    expect(fixture.indicatorCalculationProxy.calculateIndicator).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'BTCUSDT',
        candleCount: 24,
        endTime: CHART_END_TIME,
        aggregationInterval: expect.objectContaining({ value: '1h' }),
      }))
  })

  it('送出去的算式是策略記著的那一段，包回外框之後的整段', async () => {
    const fixture = buildService()

    await fixture.chartIndicatorService.calculateChartIndicator(requestOf())

    expect(fixture.indicatorCalculationProxy.calculateIndicator).toHaveBeenCalledWith(
      expect.objectContaining({ script: expect.stringContaining('sum := 0.0') }))
  })

  it('交出這一筆該畫的水平線，帶著這一次套用的身分與策略的名字', async () => {
    const fixture = buildService()

    const chartIndicator
      = await fixture.chartIndicatorService.calculateChartIndicator(requestOf())

    // 畫出來的東西屬於**這一次套用**：同一支策略可以擺好幾筆，
    // 移除哪一筆、覆蓋哪一筆都認它，而不是認策略。
    expect(chartIndicator.appliedIndicatorId).toBe(1)
    expect(chartIndicator.strategyName).toBe('二十根均線')
    expect(chartIndicator.levels.map(level => level.value)).toEqual([115])
    expect(chartIndicator.series).toEqual([])
    expect(chartIndicator.drawsNothing).toBe(false)
  })

  it('避開圖上其他線已經用掉的顏色', async () => {
    const fixture = buildService()

    const chartIndicator = await fixture.chartIndicatorService.calculateChartIndicator(
      requestOf(strategyOf(), ['--color-chart-line-1']))

    expect(chartIndicator.levels[0]?.colorToken).toBe('--color-chart-line-2')
  })

  it('只問這一次真的出現的那幾個指標名稱挑過什麼顏色', async () => {
    // 算式改過之後，舊名稱記著的顏色留在儲存裡不礙事；
    // 把它們一併撈出來只會讓「已經用掉的顏色」多出幾個其實沒人在用的。
    const fixture = buildService()

    await fixture.chartIndicatorService.calculateChartIndicator(requestOf())

    expect(fixture.chartLineColorPreferenceProxy.readColorToken)
      .toHaveBeenCalledExactlyOnceWith('7:均價')
  })

  it('這條線挑過顏色時就用挑過的那個', async () => {
    const fixture = buildService(undefined, {
      readColorToken: vi.fn().mockReturnValue('--color-chart-line-4'),
    })

    const chartIndicator
      = await fixture.chartIndicatorService.calculateChartIndicator(requestOf())

    expect(chartIndicator.levels[0]?.colorToken).toBe('--color-chart-line-4')
  })

  it('一個指標名稱都沒算出來是成功，只是沒有線可畫', async () => {
    const fixture = buildService(new IndicatorCalculation('BTCUSDT', '1h', 24, 'float', []))

    const chartIndicator
      = await fixture.chartIndicatorService.calculateChartIndicator(requestOf())

    expect(chartIndicator.drawsNothing).toBe(true)
  })

  it('算失敗時原樣往上拋，由呼叫端決定怎麼說', async () => {
    const scriptFailure = new Error('算式執行失敗')
    const failing = new ChartIndicatorService(
      { calculateIndicator: vi.fn().mockRejectedValue(scriptFailure) },
      { readColorToken: vi.fn().mockReturnValue(null), writeColorToken: vi.fn() },
      { readValue: vi.fn().mockReturnValue(null), writeValue: vi.fn() },
      {
        readAppliedChartIndicators: vi.fn().mockReturnValue([]),
        writeAppliedChartIndicators: vi.fn(),
      })

    await expect(failing.calculateChartIndicator(requestOf())).rejects.toBe(scriptFailure)
  })
})

describe('ChartIndicatorService.changeChartLineColor', () => {
  it('記住新挑的顏色，並就地把那條線換成新顏色', async () => {
    // 記住與就地換色是同一件事的兩半：只記住會讓畫面等下一次重算，
    // 而重算一次只為了換顏色，算出來的值一個字都不會變。
    const fixture = buildService()
    const chartIndicator
      = await fixture.chartIndicatorService.calculateChartIndicator(requestOf())

    const recoloured = fixture.chartIndicatorService.changeChartLineColor(
      [chartIndicator], '7:均價', '--color-chart-line-5')

    expect(fixture.chartLineColorPreferenceProxy.writeColorToken)
      .toHaveBeenCalledWith('7:均價', '--color-chart-line-5')
    expect(recoloured[0]?.levels[0]?.colorToken).toBe('--color-chart-line-5')
  })

  it('只換那一條，其他線不動', async () => {
    const fixture = buildService(new IndicatorCalculation('BTCUSDT', '1h', 24, 'float', [
      new IndicatorValueVo('甲', [1]),
      new IndicatorValueVo('乙', [2]),
    ]))
    const chartIndicator
      = await fixture.chartIndicatorService.calculateChartIndicator(requestOf())
    const untouchedLineKey = chartIndicator.levels[1]?.lineKey ?? ''
    const untouchedColor = chartIndicator.levels[1]?.colorToken

    const recoloured = fixture.chartIndicatorService.changeChartLineColor(
      [chartIndicator], chartIndicator.levels[0]?.lineKey ?? '', '--color-chart-line-6')

    expect(recoloured[0]?.levels[0]?.colorToken).toBe('--color-chart-line-6')
    expect(recoloured[0]?.levels.find(level => level.lineKey === untouchedLineKey)?.colorToken)
      .toBe(untouchedColor)
  })
})

describe('ChartIndicatorService.listChartLineColorOptions', () => {
  it('六種都在，帶給人看的名字', () => {
    const { chartIndicatorService } = buildService()

    const options = chartIndicatorService.listChartLineColorOptions()

    expect(options).toHaveLength(6)
    expect(options[0]?.token).toBe('--color-chart-line-1')
    expect(options.every(option => option.label.length > 0)).toBe(true)
  })
})

describe('ChartIndicatorService：曲線那一半也一樣', () => {
  const seriesCalculation = new IndicatorCalculation(
    'BTCUSDT', '1h', 3, 'floatList', [new IndicatorValueVo('線', [100, 110])],
    [new Date('2026-09-02T10:00:00.000Z'), new Date('2026-09-02T11:00:00.000Z')])

  it('曲線也說得出它用掉的顏色，下一支才避得開', async () => {
    const fixture = buildService(seriesCalculation)

    const chartIndicator = await fixture.chartIndicatorService.calculateChartIndicator(
      requestOf(strategyOf('floatList')))

    expect(chartIndicator.levels).toEqual([])
    expect(chartIndicator.usedColorTokens).toEqual(['--color-chart-line-1'])
  })

  it('換色也換得動曲線', async () => {
    const fixture = buildService(seriesCalculation)
    const chartIndicator = await fixture.chartIndicatorService.calculateChartIndicator(
      requestOf(strategyOf('floatList')))

    const recoloured = fixture.chartIndicatorService.changeChartLineColor(
      [chartIndicator], '7:線', '--color-chart-line-6')

    expect(recoloured[0]?.series[0]?.colorToken).toBe('--color-chart-line-6')
    // 點一個都不能少——換的是顏色，不是資料。
    expect(recoloured[0]?.series[0]?.points).toHaveLength(2)
  })

  it('換色時不是這條線的就原樣交回', async () => {
    const fixture = buildService(seriesCalculation)
    const chartIndicator = await fixture.chartIndicatorService.calculateChartIndicator(
      requestOf(strategyOf('floatList')))

    const recoloured = fixture.chartIndicatorService.changeChartLineColor(
      [chartIndicator], '7:不存在的線', '--color-chart-line-6')

    expect(recoloured[0]?.series[0]?.colorToken).toBe('--color-chart-line-1')
  })
})

describe('ChartIndicatorService.restoreAppliedIndicators', () => {
  it('讀留存的那幾筆，對照現在的策略清單交出來', () => {
    // 呼叫端只說「把上次那幾支還原回來」——它不知道留存存在，也不該知道。
    const fixture = buildService(undefined, {}, {}, {
      readAppliedChartIndicators: vi.fn().mockReturnValue([
        new RememberedAppliedIndicatorVo(7, new Map([['期數', 60]]))]),
    })
    const strategy = new StrategyDto(
      7, '均線',
      new StrategyContentDto('sum := 0.0', 'float', [
        new StrategyParameterDto('期數', 'lookbackCount', 20)]),
      true, true)

    const restored = fixture.chartIndicatorService.restoreAppliedIndicators([strategy], 0)

    expect(restored.map(one => [one.id, one.strategy.name, one.parameterSummary]))
      .toEqual([[1, '均線', '期數 60']])
  })

  it('一筆都沒留存時交出空的一份', () => {
    const fixture = buildService()

    expect(fixture.chartIndicatorService.restoreAppliedIndicators([strategyOf()], 0)).toEqual([])
  })

  it('不為了還原多打一趟後端——策略清單是收進來的', () => {
    const fixture = buildService(undefined, {}, {}, {
      readAppliedChartIndicators: vi.fn().mockReturnValue([
        new RememberedAppliedIndicatorVo(7, new Map())]),
    })

    fixture.chartIndicatorService.restoreAppliedIndicators([strategyOf()], 0)

    expect(fixture.indicatorCalculationProxy.calculateIndicator).not.toHaveBeenCalled()
  })
})

describe('ChartIndicatorService.rememberAppliedIndicators', () => {
  it('整份寫下來，依清單的順序', () => {
    const fixture = buildService()
    const strategy = new StrategyDto(
      7, '均線',
      new StrategyContentDto('sum := 0.0', 'float', [
        new StrategyParameterDto('期數', 'lookbackCount', 20)]),
      true, true)

    fixture.chartIndicatorService.rememberAppliedIndicators([
      new AppliedIndicatorDto(1, strategy, [
        new StrategyParameterDto('期數', 'lookbackCount', 20)]),
      new AppliedIndicatorDto(2, strategy, [
        new StrategyParameterDto('期數', 'lookbackCount', 60)]),
    ])

    expect(fixture.appliedChartIndicatorPreferenceProxy.writeAppliedChartIndicators)
      .toHaveBeenCalledWith([
        new RememberedAppliedIndicatorVo(7, new Map([['期數', 20]])),
        new RememberedAppliedIndicatorVo(7, new Map([['期數', 60]])),
      ])
  })

  it('清空清單時寫下空的一份——不寫的話它明天會回來', () => {
    const fixture = buildService()

    fixture.chartIndicatorService.rememberAppliedIndicators([])

    expect(fixture.appliedChartIndicatorPreferenceProxy.writeAppliedChartIndicators)
      .toHaveBeenCalledWith([])
  })
})
