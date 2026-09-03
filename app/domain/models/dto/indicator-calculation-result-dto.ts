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
  ) {}

  get isEmpty(): boolean {
    return this.indicatorValues.length === 0
  }
}
