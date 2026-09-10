import type { AggregationIntervalVo } from '~/domain/models/vo/aggregation-interval-vo'
import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import type { KCandleDto } from '~/domain/models/dto/k-candle-dto'

/**
 * DTO：圖表這一次要畫的東西，也是畫面拿得到的唯一形狀。
 *
 * coveredStartTime / coveredEndTime 是這批資料涵蓋的範圍——比使用者正在看的那一段更寬，
 * 因為取的時候兩側各多取了半段。下次使用者小幅拖動時，就是靠它判斷不必重新取。
 *
 * **這裡有兩個關於粗細的東西，而且必須有兩個：**
 * - `interval` 是**系統實際用了哪一種**，圖上那句「每根涵蓋」說的是它。
 * - `aggregationIntervalChoice` 是**這一批當初以哪個選擇取回的**，
 *   下一次比對「選擇換了沒」說的是它。
 *
 * 拿 `interval` 去比對會無限重取：挑「自動」、後端回「五分鐘」，
 * 下一次的選擇仍然是「自動」，卻永遠不等於「五分鐘」，於是每一次都重取。
 * 兩者型別不同（刻度 vs 選擇），拿錯不會編譯過。
 */
export class KCandleChartDto {
  constructor(
    public readonly symbol: string,
    /** 系統這一次**實際**用了哪一種。給標題列看的。 */
    public readonly interval: AggregationIntervalVo,
    public readonly coveredStartTime: Date,
    public readonly coveredEndTime: Date,
    public readonly kCandles: KCandleDto[],
    /** 這一批當初以**哪個選擇**取回的。給下一次比對用的。 */
    public readonly aggregationIntervalChoice: AggregationIntervalChoiceDto,
  ) {}

  get count(): number {
    return this.kCandles.length
  }

  /**
   * 這一批涵蓋了多長（毫秒）。
   *
   * 只說自己的事實。**當初使用者看的是多長不在這裡回答**——那要除以預取倍數，
   * 而預取是加上去的那一側的規則；寫在這裡就變成兩個檔案共用一個沒有名字的除數，
   * 哪天預取比例改了，這裡會安靜地開始說錯話。
   */
  get coveredSpanMilliseconds(): number {
    return this.coveredEndTime.getTime() - this.coveredStartTime.getTime()
  }

  get isEmpty(): boolean {
    return this.kCandles.length === 0
  }

  /**
   * 最新那一根是幾點開始的。空的時候是 `null`——與 `isEmpty` 是同一件事的兩種問法。
   * 它是判斷「使用者看的是不是現在」的另一半資料。
   */
  get latestKCandleOpenTime(): Date | null {
    return this.kCandles[this.kCandles.length - 1]?.openTime ?? null
  }
}
