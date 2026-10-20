import type { ChartDrawing } from '~/domain/models/entities/chart-drawing'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'
import { SavedChartDrawingBoardDto } from '~/domain/models/dto/saved-chart-drawing-board-dto'

/** Entity：帳號裡那一份繪圖板——一邊一檔的全部繪圖（後面的疊在上面）與它的版本。 */
export class ChartDrawingBoard {
  constructor(
    public readonly marketSide: MarketSideVo,
    public readonly symbol: string,
    public readonly revision: number,
    public readonly drawings: readonly ChartDrawing[],
  ) {}

  toDto(): SavedChartDrawingBoardDto {
    return new SavedChartDrawingBoardDto(
      this.marketSide, this.symbol, this.revision, this.drawings.map(drawing => drawing.toDomain().toDto()))
  }
}
