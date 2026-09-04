import type { CalculationSpanUnit } from '~/domain/models/vo/calculation-span-vo'

/**
 * DTO：「要看多長」那個單位選單上的一個選項。
 *
 * 畫面以 value 指名選了哪一個，而不是以 label：文字是給人看的，
 * 改一個字就不該讓程式跟著壞。
 */
export class CalculationSpanUnitOptionDto {
  constructor(
    public readonly value: CalculationSpanUnit,
    public readonly label: string,
  ) {}
}
