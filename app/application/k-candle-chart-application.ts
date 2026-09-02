import type { KCandleChartService } from '~/domain/service/k-candle-chart-service'
import type { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'
import type { KCandleChartRangePresetDto } from '~/domain/models/dto/k-candle-chart-range-preset-dto'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'

/**
 * Application：K 線圖表的用例編排，全程只碰 DTO。
 * 純 TypeScript——不認識 Vue、不碰 ref/reactive。
 */
export class KCandleChartApplication {
  constructor(private readonly kCandleChartService: KCandleChartService) {}

  /** 回傳 null 代表手上那批就夠了，畫面什麼都不必做。 */
  async loadKCandleChart(
    kCandleChartViewportDto: KCandleChartViewportDto,
  ): Promise<KCandleChartDto | null> {
    return this.kCandleChartService.loadKCandleChart(kCandleChartViewportDto)
  }

  listRangePresets(): KCandleChartRangePresetDto[] {
    return this.kCandleChartService.listRangePresets()
  }
}
