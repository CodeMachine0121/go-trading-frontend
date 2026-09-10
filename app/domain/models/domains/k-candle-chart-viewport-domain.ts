import { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import type { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'

/**
 * 系統一次答得出幾根。最粗的彙總刻度是一天一根，所以拉到最遠時它同時也是「幾天」。
 *
 * 系統那一側的上限若調整，這裡要跟著改——它是兩份設定，不是一份。
 */
const ANSWERABLE_CANDLE_COUNT = 1000

/** 取資料時往前後各多取的比例——各多取正在看的那段長度的一半。 */
const PREFETCH_RATIO = 0.5

/**
 * 要跟後端要的那一段是正在看的那一段的幾倍。兩側各多取半段，所以是兩倍。
 *
 * 它有名字是因為有兩處要用它：收上限的時候（**問出去的是這一段，不是使用者看的那一段**），
 * 以及回頭從已取回區間推算「當初看的是多長」的時候。
 */
const FETCH_SPAN_MULTIPLIER = 1 + 2 * PREFETCH_RATIO

/**
 * 正在看的那一段最長多少天。
 *
 * **這不是畫面的性質，是系統一次答得出多少的換算**——而換算要除以預取倍數，
 * 因為**問出去的不是使用者看的那一段**：兩側各多取半段之後，它是兩倍長。
 * 把上限直接寫成一千天，使用者拉到五百天以上就會拿到一句「區間過大」，
 * 而那正是這個常數存在的目的要避免的事。
 */
const MAXIMUM_VISIBLE_DAYS = ANSWERABLE_CANDLE_COUNT / FETCH_SPAN_MULTIPLIER

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
 * **「每根涵蓋多久」仍然不在這三個問題裡面。** 使用者說得出他要多粗，
 * 這裡就把那句話原樣帶下去；但**一段裡該塞多粗**需要交易時段與休市日才算得對，
 * 那永遠是系統的事。這裡不算它，只轉述使用者說的話。
 *
 * 建構當下就把區間收進上限，因此實例存在就代表這一段是看得完的。
 */
export class KCandleChartViewportDomain {
  private readonly symbol: string
  private readonly startTime: Date
  private readonly endTime: Date
  private readonly loadedChart: KCandleChartDto | null
  private readonly aggregationIntervalChoice: AggregationIntervalChoiceDto

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
    this.aggregationIntervalChoice = kCandleChartViewportDto.aggregationIntervalChoice
  }

  /**
   * 這一段接下來該怎麼辦：使用者應該看到哪一段（可能已被收回上限）、
   * 要不要重新取，以及要取哪一段。
   *
   * 手上那批之所以可能還夠用，是因為取的時候兩側各多取了半段——
   * 使用者小幅拖動時，新的一段仍然整個落在裡面。
   */
  toLoadPlan(): KCandleChartLoadPlanVo {
    const spanMilliseconds = this.endTime.getTime() - this.startTime.getTime()
    const loadedChart = this.loadedChart

    // 六個會讓手上這批不夠用的理由，擺在一起讀。
    // **最後一個是「使用者改挑了另一種粗細」**：那是一批不同的 K 線，
    // 手上這批涵蓋得再廣都不算數。它比的是**選擇**而不是後端回報的刻度——
    // 挑「自動」而後端回「五分鐘」時，下一次的選擇仍然是「自動」，
    // 拿刻度去比會永遠不相等，於是每一次都重取。
    // 中間那兩個取代了以前的
    // 「刻度變了就重新取」：以前畫面自己推導刻度，所以比對得出來；挑「自動」時
    // 刻度仍然要等取回才知道，畫面唯一比對得出來的就是**它看的那一段長度變了**。
    // 涵蓋不到任何時間的那一批單獨列成一個理由，因為拿它當分母會算出一個
    // 比不出大小的答案，於是永遠判定成「沒變」——圖就從此不再更新。
    // 「當初看的是多長」由涵蓋範圍除以預取倍數推回來，而那個關係屬於這裡——
    // 加上預取的是這個檔案，所以除掉它的也該是這個檔案。
    const needsReload = loadedChart === null
      || loadedChart.symbol !== this.symbol
      || loadedChart.coveredStartTime.getTime() > this.startTime.getTime()
      || loadedChart.coveredEndTime.getTime() < this.endTime.getTime()
      || loadedChart.coveredSpanMilliseconds <= 0
      || Math.abs(
        spanMilliseconds / (loadedChart.coveredSpanMilliseconds / FETCH_SPAN_MULTIPLIER) - 1)
      > VISIBLE_SPAN_CHANGE_THRESHOLD
      || loadedChart.aggregationIntervalChoice.value !== this.aggregationIntervalChoice.value

    const prefetchMilliseconds = spanMilliseconds * PREFETCH_RATIO

    return new KCandleChartLoadPlanVo(
      needsReload,
      this.symbol,
      this.startTime,
      this.endTime,
      new Date(this.startTime.getTime() - prefetchMilliseconds),
      new Date(this.endTime.getTime() + prefetchMilliseconds),
      this.aggregationIntervalChoice,
    )
  }
}
