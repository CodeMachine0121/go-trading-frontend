import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import { KCandleChartViewportDomain } from '~/domain/models/domains/k-candle-chart-viewport-domain'
import { KCandleChartRangePresetDto } from '~/domain/models/dto/k-candle-chart-range-preset-dto'
import { KCandleSeriesDomain } from '~/domain/models/domains/k-candle-series-domain'
import type { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'
import { KCandleChartViewDto } from '~/domain/models/dto/k-candle-chart-view-dto'

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000
const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR

/**
 * 一進畫面先看哪一段。
 *
 * 它有自己的名字，而不是拿清單的第一個：那一排由短到長排，第一個是一小時，
 * 於是「一進來看多長」會變成排序的副作用——改一次順序就靜靜換掉了預設。
 * 一進來看一天是一個判斷，所以寫成一個判斷。
 */
const DEFAULT_K_CANDLE_CHART_RANGE_PRESET
  = new KCandleChartRangePresetDto('一天', 1 * MILLISECONDS_PER_DAY)

/**
 * 一鍵可切換的幾個長度，由短到長。固定的一組，不隨資料改變——
 * 它們是「值得看的幾個長度」這個判斷，不是設定。
 *
 * 幾小時的那幾個與幾個月的那幾個是同一排、同一種選擇，只是長度不同，
 * 所以不分成兩組：一條互斥的軌道才看得出「只能選一個」。
 *
 * 每根涵蓋多久仍然不在這裡。看一小時不等於要一分鐘一根——那是系統照它知道的
 * 交易時段挑的，這一排只說使用者要看多長。
 */
const K_CANDLE_CHART_RANGE_PRESETS: KCandleChartRangePresetDto[] = [
  new KCandleChartRangePresetDto('一小時', 1 * MILLISECONDS_PER_HOUR),
  new KCandleChartRangePresetDto('五小時', 5 * MILLISECONDS_PER_HOUR),
  new KCandleChartRangePresetDto('十小時', 10 * MILLISECONDS_PER_HOUR),
  DEFAULT_K_CANDLE_CHART_RANGE_PRESET,
  new KCandleChartRangePresetDto('五天', 5 * MILLISECONDS_PER_DAY),
  new KCandleChartRangePresetDto('一個月', 30 * MILLISECONDS_PER_DAY),
  new KCandleChartRangePresetDto('三個月', 90 * MILLISECONDS_PER_DAY),
  new KCandleChartRangePresetDto('六個月', 180 * MILLISECONDS_PER_DAY),
  new KCandleChartRangePresetDto('一年', 365 * MILLISECONDS_PER_DAY),
]

/**
 * Domain Service：K 線圖表的用例。
 * 公開用例方法之間互不呼叫；需要串接時由 Application 負責。
 */
export class KCandleChartService {
  constructor(private readonly kCandleProxy: IKCandleProxy) {}

  /**
   * 要後端立刻去補齊這一檔，回報補到幾根。
   *
   * 它與「載入圖表」是兩個用例，互不呼叫：補完之後要不要重畫、重畫哪一段，
   * 是看的人正在看哪裡決定的，不是補齊這件事決定的。
   */
  async catchUpSymbol(symbol: string): Promise<number> {
    return this.kCandleProxy.catchUpSymbol(symbol)
  }

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

    const kCandleSeriesVo = await this.kCandleProxy.findKCandleSeries(kCandleChartLoadPlanVo)

    return new KCandleChartViewDto(
      kCandleChartLoadPlanVo.visibleStartTime,
      kCandleChartLoadPlanVo.visibleEndTime,
      new KCandleSeriesDomain(kCandleSeriesVo, kCandleChartLoadPlanVo).toDto(),
    )
  }

  /** 畫面上一鍵可切換的幾個長度，由短到長。 */
  listRangePresets(): KCandleChartRangePresetDto[] {
    return K_CANDLE_CHART_RANGE_PRESETS
  }

  /** 一進畫面先看哪一段。 */
  defaultRangePreset(): KCandleChartRangePresetDto {
    return DEFAULT_K_CANDLE_CHART_RANGE_PRESET
  }
}
