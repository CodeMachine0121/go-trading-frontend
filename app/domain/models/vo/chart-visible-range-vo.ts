import type { AggregationIntervalVo } from '~/domain/models/vo/aggregation-interval-vo'

const MILLISECONDS_PER_MINUTE = 60 * 1000

/**
 * VO：使用者正在看的那一段時間。不可變。
 *
 * 它帶行為，是因為那些行為讀的全是這兩個時間：
 * 「跟另一段是不是同一段」與「這一段裡有幾根」都是它自己的性質。
 * 拆成兩個 Date 傳出去，這些判斷就只能長在呼叫端——那正是要避免的。
 */
export class ChartVisibleRangeVo {
  constructor(
    public readonly startTime: Date,
    public readonly endTime: Date,
  ) {}

  /**
   * 跟另一段是不是同一段。
   *
   * 這條問句本身就是一條業務規則：**同一段區間算出來的必然一樣**，
   * 所以問完之後就有理由不重算。以時刻本身比對，不比物件——
   * 兩個內容相同的 Date 是同一段，即使它們是兩個物件。
   */
  isSameAs(other: ChartVisibleRangeVo | null): boolean {
    if (other === null) {
      return false
    }

    return this.startTime.getTime() === other.startTime.getTime()
      && this.endTime.getTime() === other.endTime.getTime()
  }

  /**
   * 畫面上看得到最新那一根嗎——也就是，使用者看的是現在還是一段已經過去的行情。
   *
   * 判準是這一段的右端落在最新那一根的起始時間**之後（含）**，
   * **刻意不用時間門檻**：多少分鐘算「現在」沒有一個正確答案，而且會隨彙總刻度改變
   * 意義（看一天一根時「五分鐘之內」毫無意義）。「畫面上有沒有現在」則是使用者眼睛
   * 看得到的事實。
   *
   * 邊界取「含」，因為兩種誤判的代價不對稱：使用者明明拖到了最新那一根卻發現指標
   * 不動，比多算一次難理解得多。
   *
   * 圖上一根都沒有時不算——沒有東西可比，就沒有理由宣稱在看現在。
   */
  showsTheLatestKCandle(latestKCandleOpenTime: Date | null): boolean {
    if (latestKCandleOpenTime === null) {
      return false
    }

    return this.endTime.getTime() >= latestKCandleOpenTime.getTime()
  }

  /**
   * 這一次要算到哪一刻。
   *
   * 看得到最新那一根就**不指定**——`null` 在這裡是一個答案（「照系統的現在」），
   * 不是缺值；系統本來就規定未指定即視為現在。看不到就是這一段的右端：
   * 一段已經過去的行情，答案不該因為現在又走完一根而改變。
   *
   * 它自己把「看不看得到」用掉了，呼叫端因此不必把兩件事兜起來。
   */
  calculationEndTime(latestKCandleOpenTime: Date | null): Date | null {
    return this.showsTheLatestKCandle(latestKCandleOpenTime) ? null : this.endTime
  }

  /**
   * 這一段裡有幾根。
   *
   * 至少一根：一段短到不滿一根的區間，仍然看得見一根 K 線，
   * 而要求算零根是沒有意義的問法。
   */
  kCandleCountAt(interval: AggregationIntervalVo): number {
    const spanMinutes
      = (this.endTime.getTime() - this.startTime.getTime()) / MILLISECONDS_PER_MINUTE

    return Math.max(1, Math.floor(spanMinutes / interval.minutes))
  }
}
