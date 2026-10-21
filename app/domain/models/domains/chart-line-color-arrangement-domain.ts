import type { IChartLineColorPreferenceProxy } from '~/domain/interface/i-chart-line-color-preference-proxy'
import { ChartLineColorDomain } from '~/domain/models/domains/chart-line-color-domain'
import type { ChartIndicatorDto } from '~/domain/models/dto/chart-indicator-dto'
import { DrawnChartLinesVo } from '~/domain/models/vo/drawn-chart-lines-vo'

/**
 * Domain Model：依清單順序替圖上所有指標線重新配一次顏色。
 *
 * 「被用掉」與「同一條線已經在圖上」只看清單上排在前面的那幾支，
 * 所以誰先算好不影響誰拿到哪個顏色。
 */
export class ChartLineColorArrangementDomain {
  constructor(
    private readonly chartIndicatorsInListOrder: readonly ChartIndicatorDto[],
    private readonly chartLineColorPreferenceProxy: IChartLineColorPreferenceProxy,
  ) {}

  toChartIndicatorDtos(): ChartIndicatorDto[] {
    const takenColorTokens: string[] = []
    const earlierLineKeys: string[] = []

    return this.chartIndicatorsInListOrder.map((chartIndicator) => {
      const drawnByEarlierIndicators = [...earlierLineKeys]
      const arranged = chartIndicator.drawnLineKeys.reduce((recoloured, lineKey) => {
        const colorToken = new ChartLineColorDomain(
          lineKey,
          this.chartLineColorPreferenceProxy.readColorToken(lineKey),
          new DrawnChartLinesVo(takenColorTokens, drawnByEarlierIndicators)).token
        takenColorTokens.push(colorToken)

        return recoloured.withLineColor(lineKey, colorToken)
      }, chartIndicator)
      earlierLineKeys.push(...chartIndicator.drawnLineKeys)

      return arranged
    })
  }
}
