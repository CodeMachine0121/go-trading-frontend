import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { AggregationIntervalVo } from '~/domain/models/vo/aggregation-interval-vo'

/**
 * DTO：使用者在圖表上說出的「我要多粗」。
 *
 * 它與 `AggregationIntervalVo` 是不同的東西，而且必須是：
 * - **選擇**（這裡）只往外走：畫面 → 取回計畫 → 送給後端的條件。
 * - **刻度**（`AggregationIntervalVo`）只往內走：後端的回覆 → 圖上那句「每根涵蓋」。
 *
 * 照 TradingView，**粗細一律由看的人挑**——沒有「自動」這個選擇，所以它一定帶著一種刻度。
 */
export class AggregationIntervalChoiceDto {
  constructor(public readonly interval: AggregationIntervalVo) {}

  /** 按鈕上的說法，與那一種刻度的名字是同一個。 */
  get label(): LocalizedTextVo {
    return this.interval.label
  }

  /**
   * 選單上這一項的值，同時也是**這個選擇的身分**。
   *
   * 比對兩次選擇一不一樣一律用它，不用物件同一性：選擇未來可能從別的地方
   * 還原回來（例如上次記住的那一個），那時它是另一個實例、卻是同一個選擇。
   */
  get value(): string {
    return this.interval.value
  }

  /** 取行情時跟後端說的粗細。 */
  get declaredInterval(): string {
    return this.interval.value
  }
}
