/**
 * DTO：在算式裡讀一個參數的寫法——一種參數種類一則。
 *
 * 它與 K 線欄位那一份是**同一件事的兩半**：兩者描述的都是沙箱交給算式的東西，
 * 所以兩者都住在領域，畫面一個字都不自己寫。後端哪天改了注入的函式名，
 * 要改的是領域那一份清單，不是散在畫面上的幾段範例。
 */
export class ScriptParameterAccessDto {
  constructor(
    /** 這一則講的是哪一種參數，給人看的說法。 */
    public readonly kindLabel: string,
    /** 照抄就能用的那一行，例如 `indicator.LookbackCount("期數")`。 */
    public readonly call: string,
    /** 那一行交出來的 Go 型別，例如 `int`。 */
    public readonly returnType: string,
    /** 這一種適合拿來做什麼——一句話。 */
    public readonly usage: string,
  ) {}
}
