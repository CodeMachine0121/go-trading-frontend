import type Decimal from 'decimal.js'

/**
 * 奇異筆按住拖曳時取到的一個點：畫面上的位置（精簡筆跡用），
 * 以及它在這一張圖上是第幾根的哪個位置、多少價（換成那一刻用）。
 */
export class ChartDrawingStrokePointDto {
  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly logicalIndex: number,
    public readonly price: Decimal,
  ) {}
}
