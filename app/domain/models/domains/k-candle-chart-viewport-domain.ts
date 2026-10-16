import { KCandleChartLoadPlanVo, MAXIMUM_FETCHED_CANDLE_COUNT } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import type { KCandleChartLoadKind } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import type { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/** 整批取時往前後各多取的比例——各多取正在看的那段長度的一半。 */
const PREFETCH_RATIO = 0.5

/**
 * 看的那一頭離手上那批的邊緣不到幾個畫面寬時，就在那一側接上一段。
 *
 * 半個畫面寬：再拖半個畫面才會看到空白，接上一段的往返時間足以趕在那之前畫好；
 * 而離邊緣還有一個畫面寬以上時，不會為了「也許會拖過去」先去要。
 */
const EXTEND_THRESHOLD_RATIO = 0.5

const MILLISECONDS_PER_MINUTE = 60 * 1000

/**
 * Domain Model：使用者正在看的那一段時間，以及由它推出來的一切。
 *
 * 這是整個 K 線圖表唯一在判斷「要不要跟後端要東西、要哪一段」的地方，
 * 對外只留一個問題可以問：toLoadPlan()。
 *
 * 照 TradingView：粗細由看的人挑，縮放只是同一種 K 線變寬變窄——
 * **看的那一段變長變短，本身從來不是重新取的理由。**
 * 會去要的只有兩種情形：手上這批根本不是這張圖（換檔、換粗細、看的那一段整個在它之外），
 * 或看的那一頭快碰到手上這批的邊緣了，那就在那一側接上一段。
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
      throw new KCandleQueryValidationError(
        'symbol', new LocalizedTextVo('請指定交易標的', 'Symbol is required'))
    }

    this.symbol = normalizedSymbol
    this.startTime = kCandleChartViewportDto.visibleStartTime
    this.endTime = kCandleChartViewportDto.visibleEndTime
    this.loadedChart = kCandleChartViewportDto.loadedChart
    this.aggregationIntervalChoice = kCandleChartViewportDto.aggregationIntervalChoice
  }

  /**
   * 這一段接下來該怎麼辦：不取、整批換、往左接，或往右接，以及要取哪一段。
   *
   * 「現在」只用來判斷右邊還有沒有更晚的資料可接——手上最新那一根已經是現在時，
   * 往右拖只是看到右側留白，不必去要。
   */
  toLoadPlan(): KCandleChartLoadPlanVo {
    const now = Date.now()
    const visibleStart = this.startTime.getTime()
    const visibleEnd = this.endTime.getTime()
    const spanMilliseconds = visibleEnd - visibleStart
    const maximumFetchedMilliseconds
      = MAXIMUM_FETCHED_CANDLE_COUNT * this.aggregationIntervalChoice.interval.minutes * MILLISECONDS_PER_MINUTE
    const loadedChart = this.loadedChart
    const planOf = (kind: KCandleChartLoadKind, fetchStart: number, fetchEnd: number) =>
      new KCandleChartLoadPlanVo(
        kind, this.symbol, this.startTime, this.endTime,
        new Date(fetchStart), new Date(fetchEnd), this.aggregationIntervalChoice)

    // 手上這批不是這張圖的五個理由，擺在一起讀。比的是**選擇**（使用者挑的那一種），
    // 不是後端回報的刻度：那是兩件事，見 KCandleChartDto。
    // 涵蓋不到任何時間的那一批單獨列成一個理由——拿它接上一段，接出來的仍然什麼都沒有。
    if (loadedChart === null
      || loadedChart.symbol !== this.symbol
      || loadedChart.aggregationIntervalChoice.value !== this.aggregationIntervalChoice.value
      || loadedChart.coveredSpanMilliseconds <= 0
      || visibleEnd <= loadedChart.coveredStartTime.getTime()
      || visibleStart >= loadedChart.coveredEndTime.getTime()) {
      const prefetchMilliseconds = spanMilliseconds * PREFETCH_RATIO
      // 右側多取的那半段落在未來時一根都拿不到，卻照樣算進後端的根數上限，
      // 所以超過上限時先把它收回到「現在」（但不切到看的那一段），仍超過才收左邊——
      // 保留較晚那一端：看行情在意的是靠近現在的那一頭。
      const prefetchedEnd = visibleEnd + prefetchMilliseconds
      const prefetchedStart = visibleStart - prefetchMilliseconds
      const fetchEnd = prefetchedEnd - prefetchedStart > maximumFetchedMilliseconds
        ? Math.max(visibleEnd, Math.min(prefetchedEnd, now))
        : prefetchedEnd
      const fetchStart = Math.max(prefetchedStart, fetchEnd - maximumFetchedMilliseconds)

      return planOf('replace', fetchStart, fetchEnd)
    }

    const coveredStart = loadedChart.coveredStartTime.getTime()
    const coveredEnd = loadedChart.coveredEndTime.getTime()
    const extendThresholdMilliseconds = spanMilliseconds * EXTEND_THRESHOLD_RATIO

    if (!loadedChart.reachedEarliest && visibleStart - coveredStart < extendThresholdMilliseconds) {
      return planOf('extendEarlier', coveredStart - maximumFetchedMilliseconds, coveredStart)
    }

    // 「手上最新那一根早於現在」以一整根為準：不到一根的那一點點，即時更新本來就會補上；
    // 拿「早於現在一毫秒」當理由，每一次放手都會去要一段幾乎是空的。
    const intervalMilliseconds = this.aggregationIntervalChoice.interval.minutes * MILLISECONDS_PER_MINUTE
    if (now - coveredEnd >= intervalMilliseconds && coveredEnd - visibleEnd < extendThresholdMilliseconds) {
      return planOf('extendLater', coveredEnd, Math.min(coveredEnd + maximumFetchedMilliseconds, now))
    }

    return planOf('none', coveredStart, coveredEnd)
  }
}
