/** VO：一個指標的名稱與數值。不可變、無行為。 */
export class IndicatorValueVo {
  constructor(
    public readonly name: string,
    // 指標數值不是金額（是比例、均價之外的統計值），依規範可用一般數字型別。
    public readonly value: number,
  ) {}
}
