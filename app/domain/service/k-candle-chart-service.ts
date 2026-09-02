import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import { KCandleChartViewportDomain } from '~/domain/models/domains/k-candle-chart-viewport-domain'
import { KCandleChartRangePresetDto } from '~/domain/models/dto/k-candle-chart-range-preset-dto'
import type { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'

/**
 * 一鍵可切換的幾個長度。固定的一組，不隨資料改變——
 * 它們是「值得看的幾個長度」這個判斷，不是設定。
 */
const K_CANDLE_CHART_RANGE_PRESETS: KCandleChartRangePresetDto[] = [
  new KCandleChartRangePresetDto('一天', 1),
  new KCandleChartRangePresetDto('五天', 5),
  new KCandleChartRangePresetDto('一個月', 30),
  new KCandleChartRangePresetDto('三個月', 90),
  new KCandleChartRangePresetDto('六個月', 180),
  new KCandleChartRangePresetDto('一年', 365),
]

/**
 * Domain Service：K 線圖表的用例。
 * 公開用例方法之間互不呼叫；需要串接時由 Application 負責。
 */
export class KCandleChartService {
  constructor(private readonly kCandleProxy: IKCandleProxy) {}

  /**
   * 使用者正在看這一段，手上有這些——那接下來該畫什麼。
   *
   * **回傳 null 代表手上那批就夠了**，呼叫端什麼都不必做。
   * 這一點是整個圖表不會自己轉個不停的原因：把資料餵進圖之後圖會再說一次
   * 「正在看的區間變了」，若這裡改成「不必取時回傳手上那批」，
   * 畫面就會重畫、圖又再說一次，於是永遠停不下來。
   */
  async loadKCandleChart(
    kCandleChartViewportDto: KCandleChartViewportDto,
  ): Promise<KCandleChartDto | null> {
    const kCandleChartLoadPlanVo
      = new KCandleChartViewportDomain(kCandleChartViewportDto).toLoadPlan()

    if (!kCandleChartLoadPlanVo.needsReload) {
      return null
    }

    const kCandleSeries = await this.kCandleProxy.findKCandleSeries(kCandleChartLoadPlanVo)

    return kCandleSeries.toDomain(kCandleChartLoadPlanVo).toDto()
  }

  /** 畫面上一鍵可切換的幾個長度。 */
  listRangePresets(): KCandleChartRangePresetDto[] {
    return K_CANDLE_CHART_RANGE_PRESETS
  }
}
