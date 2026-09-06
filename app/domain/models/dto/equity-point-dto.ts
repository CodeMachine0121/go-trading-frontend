import type Decimal from 'decimal.js'

/**
 * DTO：資金曲線上的一點。
 *
 * 金額仍然是精確小數——繪圖函式庫只吃數字，但那是繪圖那一刻的限制，
 * 不是在這裡把金額變成浮點數的許可。轉換發生在畫的那一行，與 K 線圖對價格的做法一致。
 */
export class EquityPointDto {
  constructor(
    public readonly openTime: Date,
    public readonly equity: Decimal,
  ) {}
}
