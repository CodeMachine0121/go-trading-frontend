import { describe, expect, it, vi } from 'vitest'
import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import { IndicatorCalculationService } from '~/domain/service/indicator-calculation-service'
import { IndicatorCalculationFieldError } from '~/domain/errors/indicator-calculation-field-error'

const SCRIPT = 'package main\nfunc Calculate() {}'

function buildProxy(indicatorCalculation = new IndicatorCalculation('BTCUSDT', 3, [])): IIndicatorCalculationProxy {
  return { calculateIndicator: vi.fn().mockResolvedValue(indicatorCalculation) }
}

describe('IndicatorCalculationService', () => {
  it('把驗證過的請求交出去，並回傳排好序的結果', async () => {
    const indicatorCalculationProxy = buildProxy(new IndicatorCalculation('BTCUSDT', 3, [
      new IndicatorValueVo('最高', 120),
      new IndicatorValueVo('均價', 110),
    ]))
    const indicatorCalculationService = new IndicatorCalculationService(indicatorCalculationProxy)

    const resultDto = await indicatorCalculationService.calculateIndicator(
      new IndicatorCalculationRequestDto('BTCUSDT', '3', SCRIPT))

    expect(indicatorCalculationProxy.calculateIndicator).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'BTCUSDT', candleCount: 3, script: SCRIPT }))
    expect(resultDto.usedCandleCount).toBe(3)
    expect(resultDto.indicatorValues.map(indicatorValue => indicatorValue.name))
      .toEqual(['均價', '最高'])
  })

  it('輸入不合法時完全不去執行計算', async () => {
    const indicatorCalculationProxy = buildProxy()
    const indicatorCalculationService = new IndicatorCalculationService(indicatorCalculationProxy)

    await expect(indicatorCalculationService.calculateIndicator(
      new IndicatorCalculationRequestDto('', '3', SCRIPT),
    )).rejects.toBeInstanceOf(IndicatorCalculationFieldError)
    expect(indicatorCalculationProxy.calculateIndicator).not.toHaveBeenCalled()
  })

  it('範例算式是一段可直接執行的完整算式', () => {
    const exampleScript = new IndicatorCalculationService(buildProxy()).buildExampleScript()

    expect(exampleScript).toContain('package main')
    expect(exampleScript).toContain('import "indicator"')
    expect(exampleScript).toContain('func Calculate(data []indicator.KCandle) map[string]float64')
    expect(exampleScript).toContain('map[string]float64{"均價"')
  })
})
