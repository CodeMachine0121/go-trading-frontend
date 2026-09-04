import type { CalculationSpanUnit } from '~/domain/models/vo/calculation-span-vo'

/**
 * DTO：使用者說的「要看多長」——一個數字配一個單位。
 *
 * 它是雙向的：畫面把使用者打的交出來，也拿它回填預設值。
 */
export class CalculationSpanDto {
  constructor(
    public readonly amount: number,
    public readonly unit: CalculationSpanUnit,
  ) {}
}
