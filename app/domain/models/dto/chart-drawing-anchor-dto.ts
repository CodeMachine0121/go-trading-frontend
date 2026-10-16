import type Decimal from 'decimal.js'
import { ChartDrawingAnchorVo } from '~/domain/models/vo/chart-drawing-anchor-vo'

/**
 * 對齊到某一根之後的錨點：它屬於哪一刻、多少價，以及在**這一張圖上**是第幾根。
 *
 * 序位只對這一張圖有意義（換刻度就不一樣了），所以它只活在畫的那一刻，
 * 不跟著繪圖留存——留存的永遠是時間與價格。
 */
export class ChartDrawingAnchorDto {
  constructor(
    public readonly openTime: Date,
    public readonly price: Decimal,
    public readonly logicalIndex: number,
  ) {}

  toVo(): ChartDrawingAnchorVo {
    return new ChartDrawingAnchorVo(this.openTime, this.price)
  }
}
