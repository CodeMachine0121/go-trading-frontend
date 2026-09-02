/** 指標值裡的一個元素：依這次的指標值種類，是一個數字或一個是非。 */
export type IndicatorScalarValue = number | boolean

/**
 * VO：一個指標算出來的值，尚未格式化。
 *
 * 一個值與一串值存法相同——一個值就是長度一的那一串——因為它們的差別是
 * **這次計算的種類**說了算，不是每個值各自帶著。不可變、無行為。
 */
export class IndicatorValueVo {
  constructor(
    public readonly name: string,
    public readonly items: readonly IndicatorScalarValue[],
  ) {}
}
