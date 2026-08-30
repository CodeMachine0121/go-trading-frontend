import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'
import type { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import type { IndicatorCalculationResultDto } from '~/domain/models/dto/indicator-calculation-result-dto'

/**
 * 可直接執行的範例算式：求指定根數的平均收盤價。
 * 它同時示範了算式的契約——套件、進入點的名字與形式、回傳的形狀。
 */
const EXAMPLE_SCRIPT = [
  'package main',
  '',
  'import "indicator"',
  '',
  'func Calculate(data []indicator.KCandle) map[string]float64 {',
  '\tsum := 0.0',
  '\tfor _, candle := range data {',
  '\t\tsum += candle.Close',
  '\t}',
  '',
  '\treturn map[string]float64{"均價": sum / float64(len(data))}',
  '}',
].join('\n')

/**
 * Domain Service：指標計算的編排。
 * 公開用例方法之間互不呼叫。
 */
export class IndicatorCalculationService {
  constructor(private readonly indicatorCalculationProxy: IIndicatorCalculationProxy) {}

  /** 執行一次計算：驗證輸入（不合法就不送出）→ 執行 → 依名稱排好的結果。 */
  async calculateIndicator(
    indicatorCalculationRequestDto: IndicatorCalculationRequestDto,
  ): Promise<IndicatorCalculationResultDto> {
    const requestDomain = new IndicatorCalculationRequestDomain(indicatorCalculationRequestDto)
    const indicatorCalculation
      = await this.indicatorCalculationProxy.calculateIndicator(requestDomain)

    return indicatorCalculation.toDomain().toDto()
  }

  /** 給第一次使用的人一個能直接跑的起點。 */
  buildExampleScript(): string {
    return EXAMPLE_SCRIPT
  }
}
