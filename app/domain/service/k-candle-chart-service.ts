import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import type { IKCandleContractProxy } from '~/domain/interface/i-k-candle-contract-proxy'
import type { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { ChartReadoutDto } from '~/domain/models/dto/chart-readout-dto'
import { ChartReadoutDomain } from '~/domain/models/domains/chart-readout-domain'
import { KCandleContractSeriesDomain } from '~/domain/models/domains/k-candle-contract-series-domain'
import { KCandleChartViewportDomain } from '~/domain/models/domains/k-candle-chart-viewport-domain'
import { KCandleChartRangePresetDto } from '~/domain/models/dto/k-candle-chart-range-preset-dto'
import { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import { AGGREGATION_INTERVALS, aggregationIntervalOf } from '~/domain/models/vo/aggregation-interval-vo'
import { KCandleSeriesDomain } from '~/domain/models/domains/k-candle-series-domain'
import { KCandleChartMergeDomain } from '~/domain/models/domains/k-candle-chart-merge-domain'
import { DrawnKCandleRangeDomain } from '~/domain/models/domains/drawn-k-candle-range-domain'
import { ChartVisibleRangeVo } from '~/domain/models/vo/chart-visible-range-vo'
import type { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'
import { KCandleChartViewDto } from '~/domain/models/dto/k-candle-chart-view-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000
const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR

/**
 * 圖表上可挑的粗細，**由細到粗**：後端認得的六種全部都在。
 *
 * 照 TradingView，粗細一律由看的人挑，沒有「自動」——縮放只是同一種 K 線變寬變窄，
 * 不會在跨過某個長度時突然換一種粗細。
 *
 * 標籤與代號一律取自 `AGGREGATION_INTERVALS`：按鈕上寫「五分鐘」而送出去 `5m`，
 * 兩者必須永遠是同一列說的。
 */
const AGGREGATION_INTERVAL_CHOICES: AggregationIntervalChoiceDto[] = AGGREGATION_INTERVALS
  .map(interval => new AggregationIntervalChoiceDto(interval))

/**
 * 一進畫面每根涵蓋多久：一小時。
 *
 * 它有自己的名字，而不是拿清單的第幾個：那一排由細到粗排，改一次順序就會靜靜換掉預設。
 * **這裡也是「記住上次挑的那一種」將來要接上的地方。**
 */
const DEFAULT_AGGREGATION_INTERVAL_CHOICE = new AggregationIntervalChoiceDto(aggregationIntervalOf('1h'))

/**
 * 一進畫面先看哪一段：一個月——它對應的正是一進來的那一種粗細（一小時），
 * 所以一進畫面時亮著的快捷區間與粗細說的是同一件事。
 */
const DEFAULT_K_CANDLE_CHART_RANGE_PRESET = new KCandleChartRangePresetDto(
  new LocalizedTextVo('一個月', '1 month'), 30 * MILLISECONDS_PER_DAY, DEFAULT_AGGREGATION_INTERVAL_CHOICE)

/**
 * 一鍵可切換的幾個長度，由短到長，**每一個都帶著適合它的粗細**——
 * 照 TradingView 底部那排日期範圍：按一個長度時一併換到那個長度看得清楚的粗細，
 * 讓每一個長度畫出來都在幾百根之內。
 */
const K_CANDLE_CHART_RANGE_PRESETS: KCandleChartRangePresetDto[] = [
  new KCandleChartRangePresetDto(new LocalizedTextVo('一小時', '1 hour'), 1 * MILLISECONDS_PER_HOUR, new AggregationIntervalChoiceDto(aggregationIntervalOf('1m'))),
  new KCandleChartRangePresetDto(new LocalizedTextVo('五小時', '5 hours'), 5 * MILLISECONDS_PER_HOUR, new AggregationIntervalChoiceDto(aggregationIntervalOf('1m'))),
  new KCandleChartRangePresetDto(new LocalizedTextVo('十小時', '10 hours'), 10 * MILLISECONDS_PER_HOUR, new AggregationIntervalChoiceDto(aggregationIntervalOf('1m'))),
  new KCandleChartRangePresetDto(new LocalizedTextVo('一天', '1 day'), 1 * MILLISECONDS_PER_DAY, new AggregationIntervalChoiceDto(aggregationIntervalOf('5m'))),
  new KCandleChartRangePresetDto(new LocalizedTextVo('五天', '5 days'), 5 * MILLISECONDS_PER_DAY, new AggregationIntervalChoiceDto(aggregationIntervalOf('15m'))),
  DEFAULT_K_CANDLE_CHART_RANGE_PRESET,
  new KCandleChartRangePresetDto(new LocalizedTextVo('三個月', '3 months'), 90 * MILLISECONDS_PER_DAY, new AggregationIntervalChoiceDto(aggregationIntervalOf('4h'))),
  new KCandleChartRangePresetDto(new LocalizedTextVo('六個月', '6 months'), 180 * MILLISECONDS_PER_DAY, new AggregationIntervalChoiceDto(aggregationIntervalOf('1d'))),
  new KCandleChartRangePresetDto(new LocalizedTextVo('一年', '1 year'), 365 * MILLISECONDS_PER_DAY, new AggregationIntervalChoiceDto(aggregationIntervalOf('1d'))),
]

/**
 * Domain Service：K 線圖表的用例。
 * 公開用例方法之間互不呼叫；需要串接時由 Application 負責。
 *
 * 現貨與合約的圖都在這裡：看多長、可挑的粗細、何時重新取、擺到哪裡，
 * 對兩條線是同一套判斷。兩條線只差「取的是哪一條」。
 */
export class KCandleChartService {
  constructor(
    private readonly kCandleProxy: IKCandleProxy,
    private readonly kCandleContractProxy: IKCandleContractProxy,
  ) {}

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
   * 回來的一律帶著**正在看的那一段**，而 `reloadedChart` 為 `null` 代表手上那批就夠了、
   * 不必換資料；接上一段時它是併好之後的那一批。
   * 另外還帶著**圖上實際要畫的那一段**（從第幾根到第幾根）——它比使用者要求的那一段
   * 多出右側留白，而留白落在最後一根之後，沒有任何時刻指得到它。
   *
   * 「不必重新取就不取」是整個圖表不會自己轉個不停的原因：把資料餵進圖之後
   * 圖會再說一次「正在看的區間變了」，若這裡改成不必取時也回傳一批資料，
   * 畫面就會重畫、圖又再說一次，於是永遠停不下來。
   */
  async loadKCandleChart(
    kCandleChartViewportDto: KCandleChartViewportDto,
  ): Promise<KCandleChartViewDto> {
    return this.loadChartFrom(kCandleChartViewportDto, async kCandleChartLoadPlanVo =>
      new KCandleSeriesDomain(
        await this.kCandleProxy.findKCandleSeries(kCandleChartLoadPlanVo),
        kCandleChartLoadPlanVo).toDto())
  }

  /**
   * 合約那一條線的圖：與 `loadKCandleChart` 同一套判斷，取的是合約的彙總序列，
   * 畫的是它的成交價。
   */
  async loadKCandleContractChart(
    kCandleChartViewportDto: KCandleChartViewportDto,
  ): Promise<KCandleChartViewDto> {
    return this.loadChartFrom(kCandleChartViewportDto, async kCandleChartLoadPlanVo =>
      new KCandleContractSeriesDomain(
        await this.kCandleContractProxy.findKCandleContractSeries(kCandleChartLoadPlanVo),
        kCandleChartLoadPlanVo).toDto())
  }

  /**
   * 兩條線共用的那一段：照正在看的那一段排出取回計畫，需要時才取，再擺位置。
   * 呼叫端只說「要取的話，怎麼取、取回來怎麼變成一張圖」。
   */
  private async loadChartFrom(
    kCandleChartViewportDto: KCandleChartViewportDto,
    fetchChart: (kCandleChartLoadPlanVo: KCandleChartLoadPlanVo) => Promise<KCandleChartDto>,
  ): Promise<KCandleChartViewDto> {
    const kCandleChartLoadPlanVo
      = new KCandleChartViewportDomain(kCandleChartViewportDto).toLoadPlan()
    // 顯示區間在這裡組一次就好。它要去三個地方（回給畫面、算畫出來的那一段、
    // 畫面拿去算指標），而那三處各自從兩個時刻重組一次，就是同一個概念有三份複本。
    const chartVisibleRangeVo = new ChartVisibleRangeVo(
      kCandleChartLoadPlanVo.visibleStartTime, kCandleChartLoadPlanVo.visibleEndTime)

    // 接上一段時取回來的只是那一段，要併進手上這批才是這一次要畫的那一批。
    // 能走到「接上」，手上一定已經有一批——那是取回計畫判斷的前提。
    const fetchedChart = kCandleChartLoadPlanVo.kind !== 'none'
      ? await fetchChart(kCandleChartLoadPlanVo)
      : null
    const loadedChart = kCandleChartViewportDto.loadedChart
    const reloadedChart = fetchedChart !== null && kCandleChartLoadPlanVo.kind !== 'replace' && loadedChart !== null
      ? new KCandleChartMergeDomain(loadedChart, fetchedChart).toDto()
      : fetchedChart

    // 位置要照**這一次畫出去的那一批**算，而那批可能是剛取回的，也可能是手上原本那批——
    // 兩條分支在這裡合流，正是因為「畫面擺哪裡」這件事對兩者一視同仁：
    // 不必重新取的那一次照樣要擺位置（按下快捷區間常常就是這一種）。
    const drawnChart = reloadedChart ?? loadedChart

    return new KCandleChartViewDto(
      chartVisibleRangeVo,
      reloadedChart,
      new DrawnKCandleRangeDomain(drawnChart, chartVisibleRangeVo).toVo(),
      kCandleChartLoadPlanVo.kind === 'replace',
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

  /** 畫面上可挑的幾種粗細，由細到粗。 */
  listAggregationIntervalChoices(): AggregationIntervalChoiceDto[] {
    return AGGREGATION_INTERVAL_CHOICES
  }

  /** 一進畫面每根涵蓋多久。 */
  defaultAggregationIntervalChoice(): AggregationIntervalChoiceDto {
    return DEFAULT_AGGREGATION_INTERVAL_CHOICE
  }

  /** 圖例那一行：十字線所在那一根（不在 K 線上時最新那一根）與最新那一根的收盤倒數。 */
  describeReadout(chart: KCandleChartDto, hoveredIndex: number | null, now: Date): ChartReadoutDto | null {
    return new ChartReadoutDomain(chart, hoveredIndex, now).toDto()
  }
}
