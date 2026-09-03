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
