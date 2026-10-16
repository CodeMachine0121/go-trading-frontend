import type Decimal from 'decimal.js'

/**
 * 繪圖錨點：繪圖的一個點，是**某一根 K 線的起始時間＋一個價格**。
 *
 * 錨在時間上而不是「第幾根」：第幾根會隨彙總刻度改變（一小時圖的第十根不是五分鐘圖的第十根），
 * 起始時間不會——換刻度之後繪圖因此還留在原本的那一刻。
 */
export class ChartDrawingAnchorVo {
  constructor(
    public readonly openTime: Date,
    public readonly price: Decimal,
  ) {}
}
