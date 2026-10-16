import type Decimal from 'decimal.js'

/** 斐波那契回撤的一條：比例、價格與它的顏色。 */
export class FibonacciLevelDto {
  constructor(
    public readonly ratio: number,
    public readonly price: Decimal,
    public readonly colorToken: string,
  ) {}
}
