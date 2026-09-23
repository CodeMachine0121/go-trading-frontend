import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import type { IKCandleContractProxy } from '~/domain/interface/i-k-candle-contract-proxy'
import type { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { KCandleContractSeriesDomain } from '~/domain/models/domains/k-candle-contract-series-domain'
import { KCandleChartViewportDomain } from '~/domain/models/domains/k-candle-chart-viewport-domain'
import { KCandleChartRangePresetDto } from '~/domain/models/dto/k-candle-chart-range-preset-dto'
import { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import { AGGREGATION_INTERVALS } from '~/domain/models/vo/aggregation-interval-vo'
import type { AggregationIntervalValue } from '~/domain/models/vo/aggregation-interval-vo'
import { KCandleSeriesDomain } from '~/domain/models/domains/k-candle-series-domain'
import { DrawnKCandleRangeDomain } from '~/domain/models/domains/drawn-k-candle-range-domain'
import { ChartVisibleRangeVo } from '~/domain/models/vo/chart-visible-range-vo'
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
 * 一進畫面每根涵蓋多久由誰說了算。
 *
 * 它有自己的名字，而不是拿清單的第一個：那一排由細到粗排，第一個剛好是「自動」，
 * 於是「一進來由系統挑」會變成排序的副作用——改一次順序就靜靜換掉了預設。
 * 一進來由系統挑是一個判斷，所以寫成一個判斷。
 *
 * **這裡也是「記住上次挑的那一種」將來要接上的地方**：那一天要換掉的是
 * 這個判斷的內容，而不是每一個問「預設是哪一個」的呼叫端。
 */
const AUTOMATIC_AGGREGATION_INTERVAL_CHOICE = new AggregationIntervalChoiceDto('自動', null)

/**
 * 六種彙總刻度裡，圖表選單放哪幾種。
 *
 * 刻意不放**四小時與一天**：看那麼粗的人看的是好幾個月，而那種長度
 * 「自動」本來就會挑出夠粗的一種。選單每多一項，五選一那個
 * 「掃一眼就選完」的性質就少一點。
 *
 * 它列的是**代號**而不是整個刻度，因為型別會替我們把關：
 * 打錯一個字是編譯錯誤，而不是一個安靜少掉一項的選單——少一項沒有人會發現，
 * 那看起來就只是「我們沒支援那一種」。
 */
const CHOOSABLE_AGGREGATION_INTERVAL_VALUES: AggregationIntervalValue[]
  = ['1m', '5m', '15m', '1h']

/**
 * 圖表上可挑的粗細，**由細到粗**，第一項是「自動」。
 *
 * 順序沿用 `AGGREGATION_INTERVALS` 的順序，而不是上面那一列的順序——
 * 「由細到粗」是那份清單的性質，在這裡再排一次就是同一件事有兩個說法。
 *
 * 標籤與代號也一律取自那份清單，不各自新建：選單上寫「五分鐘」而送出去 `5m`，
 * 兩者必須永遠是同一列說的。
 */
const AGGREGATION_INTERVAL_CHOICES: AggregationIntervalChoiceDto[] = [
  AUTOMATIC_AGGREGATION_INTERVAL_CHOICE,
  ...AGGREGATION_INTERVALS
    .filter(interval => CHOOSABLE_AGGREGATION_INTERVAL_VALUES.includes(interval.value))
    .map(interval => new AggregationIntervalChoiceDto(interval.label, interval)),
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
   * 回來的一律帶著**應該看到的那一段**（可能已被收回上限），
   * 而 `reloadedChart` 為 `null` 代表手上那批就夠了、不必換資料。
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

    const reloadedChart = kCandleChartLoadPlanVo.needsReload
      ? await fetchChart(kCandleChartLoadPlanVo)
      : null

    // 位置要照**這一次畫出去的那一批**算，而那批可能是剛取回的，也可能是手上原本那批——
    // 兩條分支在這裡合流，正是因為「畫面擺哪裡」這件事對兩者一視同仁：
    // 不必重新取的那一次照樣要擺位置（按下快捷區間常常就是這一種）。
    const drawnChart = reloadedChart ?? kCandleChartViewportDto.loadedChart

    return new KCandleChartViewDto(
      chartVisibleRangeVo,
      reloadedChart,
      new DrawnKCandleRangeDomain(drawnChart, chartVisibleRangeVo).toVo(),
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

  /** 畫面上可挑的幾種粗細，由細到粗，第一項是「自動」。 */
  listAggregationIntervalChoices(): AggregationIntervalChoiceDto[] {
    return AGGREGATION_INTERVAL_CHOICES
  }

  /** 一進畫面每根涵蓋多久由誰說了算。 */
  defaultAggregationIntervalChoice(): AggregationIntervalChoiceDto {
    return AUTOMATIC_AGGREGATION_INTERVAL_CHOICE
  }
}
