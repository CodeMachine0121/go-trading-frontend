import type { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { IndicatorCalculationDomain } from '~/domain/models/domains/indicator-calculation-domain'

/**
 * Entity：一次指標計算的結果本體，只有欄位。
 * 指標的數量與名稱都是算式決定的，空的一組也是合法結果。
 * `resultType` 與 `interval` 都是**後端回報的**，不是送出時挑的那兩個——
 * 照回報的呈現才不會說謊。彙總刻度尤其如此：它剛從「寫下來但沒生效」變成真的生效，
 * 而在那之後最糟的失敗不是報錯，是安靜地用了另一種刻度。
 */
export class IndicatorCalculation {
  constructor(
    public readonly symbol: string,
    public readonly interval: string,
    public readonly usedCandleCount: number,
    public readonly resultType: string,
    public readonly indicatorValues: IndicatorValueVo[],
    /**
     * 這次餵給算式的每一根 K 線從哪裡開始，由早到晚。
     *
     * 一串指標值的第 n 個對應這裡的第 n 個。它存在的理由是**不要自己反推**：
     * 從刻度、根數與截止時間重算一次切格規則，只要與系統差一格，
     * 整條線就會錯位，而錯位的線看起來完全正常。
     */
    public readonly openTimes: readonly Date[] = [],
    /**
     * 「一個信號」種類下後端回報的那一個信號值（`buy` / `sell` / `hold`），
     * 其餘四種種類下為 `null`。它沒有指標名稱，所以不在 indicatorValues 裡。
     */
    public readonly signal: string | null = null,
    /**
     * 填滿這一段要幾根。它的搭檔是 `usedCandleCount`——兩者同為彙總 K 線的根數，
     * 所以並列說得出一句不混單位的話。
     *
     * **`null` 是一個答案，不是缺值**：系統這一次沒有說出這個數字（舊版的系統不回它）。
     * 那時候一律不猜、也不自行推算——那條式子（格數 ＋ 最大回看根數 − 1）是系統的規則，
     * 抄一份到這裡，兩邊哪天算得不一樣時，說出來的那句話會安靜地錯。
     * 它與 `openTimes`、`signal` 一樣擺在最後並預設「沒說」，理由完全相同。
     *
     * 它與**送出去**的那個根數共用同一個技術名稱卻不是同一個數：
     * 要看 100 格配上回看 20 根，送出去的是 100、回來的是 119。
     */
    public readonly candleCount: number | null = null,
  ) {}

  toDomain(): IndicatorCalculationDomain {
    return new IndicatorCalculationDomain(this)
  }
}
