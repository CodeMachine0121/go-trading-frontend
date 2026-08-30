import type { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'

/**
 * DTO：一次計算的結果形狀。
 * 指標已依名稱排好、是否空無一物也判斷好——畫面不必自己排也不必自己判斷。
 */
export class IndicatorCalculationResultDto {
  constructor(
    public readonly symbol: string,
    public readonly usedCandleCount: number,
    public readonly indicatorValues: IndicatorValueVo[],
  ) {}

  get isEmpty(): boolean {
    return this.indicatorValues.length === 0
  }
}
