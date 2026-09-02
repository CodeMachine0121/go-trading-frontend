import { describe, expect, it, vi } from 'vitest'
import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import { IndicatorCalculationService } from '~/domain/service/indicator-calculation-service'
import { IndicatorCalculationFieldError } from '~/domain/errors/indicator-calculation-field-error'

const SCRIPT_BODY = 'return map[string]float64{"均價": 110}'

function buildProxy(
  indicatorCalculation = new IndicatorCalculation('BTCUSDT', 3, 'float', []),
): IIndicatorCalculationProxy {
  return { calculateIndicator: vi.fn().mockResolvedValue(indicatorCalculation) }
}

describe('IndicatorCalculationService', () => {
  it('把驗證過的請求交出去，並回傳排好序的結果', async () => {
    const indicatorCalculationProxy = buildProxy(new IndicatorCalculation('BTCUSDT', 3, 'float', [
      new IndicatorValueVo('最高', [120]),
      new IndicatorValueVo('均價', [110]),
    ]))
    const indicatorCalculationService = new IndicatorCalculationService(indicatorCalculationProxy)

    const resultDto = await indicatorCalculationService.calculateIndicator(
      new IndicatorCalculationRequestDto('BTCUSDT', '3', SCRIPT_BODY, 'float'))

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
      new IndicatorCalculationRequestDto('BTCUSDT', '3', SCRIPT_BODY, 'boolList'))

    expect(indicatorCalculationProxy.calculateIndicator).toHaveBeenCalledWith(
      expect.objectContaining({
        script: expect.stringContaining(`\t${SCRIPT_BODY}`),
      }))
  })

  it('輸入不合法時完全不去執行計算', async () => {
    const indicatorCalculationProxy = buildProxy()
    const indicatorCalculationService = new IndicatorCalculationService(indicatorCalculationProxy)

    await expect(indicatorCalculationService.calculateIndicator(
      new IndicatorCalculationRequestDto('', '3', SCRIPT_BODY, 'float'),
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
