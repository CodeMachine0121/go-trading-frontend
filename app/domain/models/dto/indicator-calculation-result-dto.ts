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
  ) {}

  /** 這次算的是「一個信號」種類。畫面據此渲染一個結論而不是名稱-數值表。 */
  get isSignal(): boolean {
    return this.signalLabel !== null
  }

  get isEmpty(): boolean {
    return this.indicatorValues.length === 0 && this.signalLabel === null
  }
}
