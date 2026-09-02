import type { KCandleChartService } from '~/domain/service/k-candle-chart-service'
import type { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'
import type { KCandleChartRangePresetDto } from '~/domain/models/dto/k-candle-chart-range-preset-dto'
import type { KCandleChartViewDto } from '~/domain/models/dto/k-candle-chart-view-dto'

/**
 * Application：K 線圖表的用例編排，全程只碰 DTO。
 * 純 TypeScript——不認識 Vue、不碰 ref/reactive。
 */
export class KCandleChartApplication {
  constructor(private readonly kCandleChartService: KCandleChartService) {}

  /**
   * 回來的一律帶著使用者應該看到的那一段（可能已被收回上限）；
   * 其中的 `reloadedChart` 為 `null` 代表手上那批就夠了，不必換資料。
   */
  async loadKCandleChart(
    kCandleChartViewportDto: KCandleChartViewportDto,
  ): Promise<KCandleChartViewDto> {
    return this.kCandleChartService.loadKCandleChart(kCandleChartViewportDto)
  }

  listRangePresets(): KCandleChartRangePresetDto[] {
    return this.kCandleChartService.listRangePresets()
  }
}
