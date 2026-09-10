import type { AggregationIntervalVo } from '~/domain/models/vo/aggregation-interval-vo'

/**
 * 「沒挑」在選單上的值。它**只**存在於這個檔案裡——
 * 對其他人來說「沒挑」就是 `interval` 為 `null`，不是某個要記得比對的字串。
 */
const AUTOMATIC_CHOICE_VALUE = 'auto'

/**
 * DTO：使用者在圖表上說出的「我要多粗」，**含「沒挑」這個合法值**。
 *
 * 它與 `AggregationIntervalVo` 是不同的東西，而且必須是：
 * - **選擇**（這裡）只往外走：畫面 → 取回計畫 → 送給後端的條件。
 * - **刻度**（`AggregationIntervalVo`）只往內走：後端的回覆 → 圖上那句「每根涵蓋」。
 *
 * 兩條路不交會，於是「拿使用者挑的那個去標題列充數」寫不出來，
 * 「拿後端回報的那個去比對要不要重取」那個無限重取也寫不出來。
 *
 * **「自動」不是第七種彙總刻度，是「這句話不說」**，所以它是 `interval === null`
 * 而不是一個假刻度、也不是一個 `isAutomatic` 布林——布林允許
 * 「說自己是自動、手上卻拿著一個刻度」這種說不通的狀態存在，`null` 不允許。
 */
export class AggregationIntervalChoiceDto {
  constructor(
    public readonly label: string,
    /** 沒挑（自動）時是 `null`。 */
    public readonly interval: AggregationIntervalVo | null,
  ) {}

  /**
   * 選單上這一項的值，同時也是**這個選擇的身分**。
   *
   * 比對兩次選擇一不一樣一律用它，不用物件同一性：選擇未來可能從別的地方
   * 還原回來（例如上次記住的那一個），那時它是另一個實例、卻是同一個選擇。
   */
  get value(): string {
    return this.interval?.value ?? AUTOMATIC_CHOICE_VALUE
  }

  /**
   * 取行情時要說出去的那一個刻度；**沒挑時是 `null`，代表什麼都不說**。
   *
   * 什麼都不說是有意義的一句話：後端會照那一檔的交易時段自己挑一種，
   * 並在回覆裡說出它挑了哪一種。畫面永遠不推導它。
   */
  get declaredInterval(): string | null {
    return this.interval?.value ?? null
  }
}
