import { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import type { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'

/**
 * 正在看的那一段最長多少天。
 *
 * **這不是畫面的性質，是系統一次答得出多少的換算**：最粗的彙總刻度是一天一根，
 * 系統一次最多答一千根，所以一千天就是它答得出來的極限。守住它，
 * 使用者就永遠不會因為把圖拉遠而看到一句「區間過大」。
 *
 * 系統那一側的上限若調整，這裡要跟著改——它是兩份設定，不是一份。
 */
const MAXIMUM_VISIBLE_DAYS = 1000

/**
 * 正在看的那一段長度變了多少就要重新取。
 *
 * 畫面不再推導刻度，因此它**算不出「刻度該不該變」**——只算得出「我看的長度變了」。
 * 這是那件事的代理指標，所以門檻的兩端都會出事：太鬆，每一格縮放都重新取、圖不停閃；
 * 太緊，放大之後仍然畫著粗刻度，**放大這個動作看起來就是壞的**。
 *
 * 兩成半的取法：相鄰兩種刻度至少差三倍（一分鐘→五分鐘、十五分鐘→一小時），
 * 所以要跨過一個刻度邊界，長度至少得變三倍——兩成半遠低於它，
 * 該換刻度時一定會重取；而手動微調很少超過兩成半，不該重取時通常不會重取。
 * 取捨的方向是明確的：**寧可多取一次，也不要讓放大看起來沒有作用。**
 */
const VISIBLE_SPAN_CHANGE_THRESHOLD = 0.25

/** 取資料時往前後各多取的比例——各多取正在看的那段長度的一半。 */
const PREFETCH_RATIO = 0.5

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Domain Model：使用者正在看的那一段時間，以及由它推出來的一切。
 *
 * 這是整個 K 線圖表唯一在做判斷的地方。使用者滾一下滾輪之後該發生什麼事，
 * 是三個彼此相依的問題：要不要把區間收回上限、要不要重新取、要取哪一段。
 * 它們分散開來就會變成畫面裡一串互相牽扯的判斷，
 * 也正是「重畫觸發取資料、取資料又觸發重畫」那個循環的溫床，
 * 所以對外只留一個問題可以問：toLoadPlan()。
 *
 * **「每根涵蓋多久」不在這三個問題裡面。** 它需要交易時段與休市日才算得對，
 * 而那是系統知道的事——畫面只說使用者在看哪一段，刻度照系統回報的來。
 *
 * 建構當下就把區間收進上限，因此實例存在就代表這一段是看得完的。
 */
export class KCandleChartViewportDomain {
  private readonly symbol: string
  private readonly startTime: Date
  private readonly endTime: Date
  private readonly loadedChart: KCandleChartDto | null

  constructor(kCandleChartViewportDto: KCandleChartViewportDto) {
    const normalizedSymbol = kCandleChartViewportDto.symbol.trim()
    if (normalizedSymbol === '') {
      throw new KCandleQueryValidationError('symbol', '請指定交易標的')
    }

    const maximumSpanMilliseconds = MAXIMUM_VISIBLE_DAYS * MILLISECONDS_PER_DAY
    const requestedSpanMilliseconds
      = kCandleChartViewportDto.visibleEndTime.getTime()
        - kCandleChartViewportDto.visibleStartTime.getTime()

    // 收回上限時保留較晚的那一端：看行情在意的是靠近現在的那一頭。
    this.startTime = requestedSpanMilliseconds > maximumSpanMilliseconds
      ? new Date(kCandleChartViewportDto.visibleEndTime.getTime() - maximumSpanMilliseconds)
      : kCandleChartViewportDto.visibleStartTime

    this.symbol = normalizedSymbol
    this.endTime = kCandleChartViewportDto.visibleEndTime
    this.loadedChart = kCandleChartViewportDto.loadedChart
  }

  /**
   * 這一段接下來該怎麼辦：使用者應該看到哪一段（可能已被收回上限）、
   * 要不要重新取，以及要取哪一段。
   *
   * 手上那批之所以可能還夠用，是因為取的時候兩側各多取了半段——
   * 使用者小幅拖動時，新的一段仍然整個落在裡面。
   */
  toLoadPlan(): KCandleChartLoadPlanVo {
    const loadedChart = this.loadedChart
    const needsReload = loadedChart === null
      || loadedChart.symbol !== this.symbol
      || loadedChart.coveredStartTime.getTime() > this.startTime.getTime()
      || loadedChart.coveredEndTime.getTime() < this.endTime.getTime()
      || this.spanChangedSince(loadedChart)

    const prefetchMilliseconds
      = (this.endTime.getTime() - this.startTime.getTime()) * PREFETCH_RATIO

    return new KCandleChartLoadPlanVo(
      needsReload,
      this.symbol,
      this.startTime,
      this.endTime,
      new Date(this.startTime.getTime() - prefetchMilliseconds),
      new Date(this.endTime.getTime() + prefetchMilliseconds),
    )
  }

  /**
   * 正在看的那一段，與手上這批當初取的那一段相比，長度變了超過門檻沒有。
   *
   * 手上這批當初看的是多長不必另外記：取回時兩側各多取半段，
   * 所以已取回區間的長度恰好是當初顯示區間的兩倍。
   *
   * 這一問取代了以前的「刻度變了就重新取」。以前畫面自己推導刻度，所以比對得出來；
   * 現在刻度要等取回才知道，畫面手上唯一比對得出來的就是長度。
   */
  private spanChangedSince(loadedChart: KCandleChartDto): boolean {
    const loadedSpanMilliseconds
      = (loadedChart.coveredEndTime.getTime() - loadedChart.coveredStartTime.getTime())
        / (1 + 2 * PREFETCH_RATIO)
    if (loadedSpanMilliseconds <= 0) {
      return true
    }

    const currentSpanMilliseconds = this.endTime.getTime() - this.startTime.getTime()

    return Math.abs(currentSpanMilliseconds / loadedSpanMilliseconds - 1)
      > VISIBLE_SPAN_CHANGE_THRESHOLD
  }
}
