import type { IndicatorValueDto } from '~/domain/models/dto/indicator-value-dto'

/**
 * DTO：一次計算的結果形狀。
 * 指標已依名稱排好、值已格式化好、是否空無一物也判斷好——
 * 畫面不必自己排、不必自己判斷，也不必知道是非該顯示什麼字。
 *
 * 它也說出這次**實際**用了多粗的 K 線。挑了一小時卻用五分鐘算的這種錯，
 * 數字照樣長得像對的，所以要讓它看得見，而不是靠信任。
 */
export class IndicatorCalculationResultDto {
  constructor(
    public readonly symbol: string,
    /** 這次**實際**採用的彙總刻度，已經是給人看的名字。 */
    public readonly intervalLabel: string,
    public readonly usedCandleCount: number,
    public readonly resultTypeLabel: string,
    public readonly indicatorValues: readonly IndicatorValueDto[],
    /**
     * 「一個信號」種類的產出——一個買入／賣出／持有的結論，已經是中文。
     * 其餘四種種類下為 `null`。信號沒有指標名稱，所以它不進 indicatorValues。
     */
    public readonly signalLabel: string | null = null,
    /** 供畫面決定結論的顏色：買入好、賣出壞、持有中性。 */
    public readonly signalTone: 'positive' | 'negative' | 'neutral' | null = null,
    /**
     * 這一次沒有畫滿，該說的那一句話；畫滿了、或系統沒說填滿要幾根時為 `null`。
     *
     * 交出去的是**那句話**而不是兩個數字，因為「有沒有畫滿」與「怎麼講」都是業務判斷。
     * 畫面因此只剩一個是不是 `null` 的判斷，不必自己比大小、也不必自己組句子。
     *
     * **它不是一種失敗**：結果照樣顯示，這一句只是說那些數字是以較少的行情算出來的。
     */
    public readonly shortCoverageMessage: string | null = null,
  ) {}

  /** 這次算的是「一個信號」種類。畫面據此渲染一個結論而不是名稱-數值表。 */
  get isSignal(): boolean {
    return this.signalLabel !== null
  }

  get isEmpty(): boolean {
    return this.indicatorValues.length === 0 && this.signalLabel === null
  }
}
