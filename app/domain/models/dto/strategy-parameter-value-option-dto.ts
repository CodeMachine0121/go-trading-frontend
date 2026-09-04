/**
 * DTO：一個是非參數挑得到的其中一個值。
 *
 * 挑得到哪幾個、每一個叫什麼，都是領域的答案而不是畫面的字面值——
 * 與「是非的指標值顯示成什麼」同一條規則。畫面把它接上選單就好。
 */
export class StrategyParameterValueOptionDto {
  constructor(
    public readonly value: number,
    public readonly label: string,
  ) {}
}
