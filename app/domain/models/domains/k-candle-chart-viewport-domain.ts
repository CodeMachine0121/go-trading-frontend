import {
  AGGREGATION_INTERVALS,
  COARSEST_AGGREGATION_INTERVAL,
  type AggregationIntervalVo,
} from '~/domain/models/vo/aggregation-interval-vo'
import { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import type { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'

/** 正在看的那一段裡最多擺幾根還看得清楚。彙總刻度就是照這個數字挑出來的。 */
const READABLE_KCANDLE_COUNT = 400

/** 取資料時往前後各多取的比例——各多取正在看的那段長度的一半。 */
const PREFETCH_RATIO = 0.5

const MILLISECONDS_PER_MINUTE = 60 * 1000

/**
 * Domain Model：使用者正在看的那一段時間，以及由它推出來的一切。
 *
 * 這是整個 K 線圖表唯一在做判斷的地方。使用者滾一下滾輪之後該發生什麼事，
 * 是四個彼此相依的問題：要不要把區間收回上限、每根該涵蓋多久、要不要重新取、要取哪一段。
 * 它們分散開來就會變成畫面裡一串互相牽扯的判斷，
 * 也正是「重畫觸發取資料、取資料又觸發重畫」那個循環的溫床，
 * 所以對外只留一個問題可以問：toLoadPlan()。
 *
 * 建構當下就把區間收進上限，因此實例存在就代表這一段是看得完的。
 */
export class KCandleChartViewportDomain {
  private readonly symbol: string
  private readonly startTime: Date
  private readonly endTime: Date
  private readonly interval: AggregationIntervalVo
  private readonly loadedChart: KCandleChartDto | null

  constructor(kCandleChartViewportDto: KCandleChartViewportDto) {
    const normalizedSymbol = kCandleChartViewportDto.symbol.trim()
    if (normalizedSymbol === '') {
      throw new KCandleQueryValidationError('symbol', '請指定交易標的')
    }

    const requestedSpanMinutes = (
      kCandleChartViewportDto.visibleEndTime.getTime()
      - kCandleChartViewportDto.visibleStartTime.getTime()
    ) / MILLISECONDS_PER_MINUTE

    // 由細到粗走過可選刻度，取第一個能讓畫面上不超過上限根數的那一種。
    // 一種都不夠粗，代表使用者拉得比最粗的刻度所能涵蓋的還要遠。
    const fineEnoughInterval = AGGREGATION_INTERVALS.find(
      aggregationInterval =>
        requestedSpanMinutes / aggregationInterval.minutes <= READABLE_KCANDLE_COUNT)

    this.interval = fineEnoughInterval === undefined
      ? COARSEST_AGGREGATION_INTERVAL
      : fineEnoughInterval

    // 收回上限時保留較晚的那一端：看行情在意的是靠近現在的那一頭。
    const maximumSpanMinutes = this.interval.minutes * READABLE_KCANDLE_COUNT
    this.startTime = requestedSpanMinutes > maximumSpanMinutes
      ? new Date(kCandleChartViewportDto.visibleEndTime.getTime()
        - maximumSpanMinutes * MILLISECONDS_PER_MINUTE)
      : kCandleChartViewportDto.visibleStartTime

    this.symbol = normalizedSymbol
    this.endTime = kCandleChartViewportDto.visibleEndTime
    this.loadedChart = kCandleChartViewportDto.loadedChart
  }

  /**
   * 這一段接下來該怎麼辦：要不要重新取，以及要取哪一段、用哪一種刻度。
   *
   * 手上那批之所以可能還夠用，是因為取的時候兩側各多取了半段——
   * 使用者小幅拖動時，新的一段仍然整個落在裡面。
   */
  toLoadPlan(): KCandleChartLoadPlanVo {
    const loadedChart = this.loadedChart
    const needsReload = loadedChart === null
      || loadedChart.symbol !== this.symbol
      || loadedChart.interval.value !== this.interval.value
      || loadedChart.coveredStartTime.getTime() > this.startTime.getTime()
      || loadedChart.coveredEndTime.getTime() < this.endTime.getTime()

    const prefetchMilliseconds
      = (this.endTime.getTime() - this.startTime.getTime()) * PREFETCH_RATIO

    return new KCandleChartLoadPlanVo(
      needsReload,
      this.symbol,
      this.interval,
      new Date(this.startTime.getTime() - prefetchMilliseconds),
      new Date(this.endTime.getTime() + prefetchMilliseconds),
    )
  }
}
