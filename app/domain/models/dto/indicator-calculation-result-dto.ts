import type { IndicatorValueDto } from '~/domain/models/dto/indicator-value-dto'

/**
 * DTO：一次計算的結果形狀。
 * 指標已依名稱排好、值已格式化好、是否空無一物也判斷好——
 * 畫面不必自己排、不必自己判斷，也不必知道是非該顯示什麼字。
 */
export class IndicatorCalculationResultDto {
  constructor(
    public readonly symbol: string,
    public readonly usedCandleCount: number,
    public readonly resultTypeLabel: string,
    public readonly indicatorValues: readonly IndicatorValueDto[],
  ) {}

  get isEmpty(): boolean {
    return this.indicatorValues.length === 0
  }
}
