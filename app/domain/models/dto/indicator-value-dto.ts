/**
 * DTO：一個指標的值交給畫面的形狀。
 *
 * 值已經格式化成可直接顯示的字串——是非要顯示「是」還是「否」是領域的判斷，
 * 不是畫面的。一串就是好幾個字串，一個值就是長度一的那一串。
 */
export class IndicatorValueDto {
  constructor(
    public readonly name: string,
    public readonly displayValues: readonly string[],
    public readonly isSeries: boolean,
  ) {}

  /** 一串，但裡面一個值也沒有。畫面要明說它是空的，而不是留白。 */
  get isEmptySeries(): boolean {
    return this.isSeries && this.displayValues.length === 0
  }
}
