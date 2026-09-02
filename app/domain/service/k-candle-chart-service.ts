import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import { KCandleChartViewportDomain } from '~/domain/models/domains/k-candle-chart-viewport-domain'
import { KCandleChartRangePresetDto } from '~/domain/models/dto/k-candle-chart-range-preset-dto'
import { KCandleSeriesDomain } from '~/domain/models/domains/k-candle-series-domain'
import type { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'
import { KCandleChartViewDto } from '~/domain/models/dto/k-candle-chart-view-dto'

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
   * 使用者正在看這一段，手上有這些——那接下來該畫什麼、該把位置擺到哪裡。
   *
   * 回來的一律帶著**應該看到的那一段**（可能已被收回上限），
   * 而 `reloadedChart` 為 `null` 代表手上那批就夠了、不必換資料。
   *
   * 「不必重新取就不取」是整個圖表不會自己轉個不停的原因：把資料餵進圖之後
   * 圖會再說一次「正在看的區間變了」，若這裡改成不必取時也回傳一批資料，
   * 畫面就會重畫、圖又再說一次，於是永遠停不下來。
   */
  async loadKCandleChart(
    kCandleChartViewportDto: KCandleChartViewportDto,
  ): Promise<KCandleChartViewDto> {
    const kCandleChartLoadPlanVo
      = new KCandleChartViewportDomain(kCandleChartViewportDto).toLoadPlan()

    if (!kCandleChartLoadPlanVo.needsReload) {
      return new KCandleChartViewDto(
        kCandleChartLoadPlanVo.visibleStartTime,
        kCandleChartLoadPlanVo.visibleEndTime,
        null,
      )
    }

    const kCandles = await this.kCandleProxy.findKCandleSeries(kCandleChartLoadPlanVo)

    return new KCandleChartViewDto(
      kCandleChartLoadPlanVo.visibleStartTime,
      kCandleChartLoadPlanVo.visibleEndTime,
      new KCandleSeriesDomain(kCandles, kCandleChartLoadPlanVo).toDto(),
    )
  }

  /** 畫面上一鍵可切換的幾個長度。 */
  listRangePresets(): KCandleChartRangePresetDto[] {
    return K_CANDLE_CHART_RANGE_PRESETS
  }
}
