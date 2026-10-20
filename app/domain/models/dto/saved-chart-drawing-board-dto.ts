import type { ChartDrawingDto } from '~/domain/models/dto/chart-drawing-dto'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'
import { ChartDrawingBoard } from '~/domain/models/entities/chart-drawing-board'

/** 帳號裡那一份繪圖板對外的樣子。 */
export class SavedChartDrawingBoardDto {
  constructor(
    public readonly marketSide: MarketSideVo,
    public readonly symbol: string,
    public readonly revision: number,
    public readonly drawings: readonly ChartDrawingDto[],
  ) {}

  toEntity(): ChartDrawingBoard {
    return new ChartDrawingBoard(
      this.marketSide, this.symbol, this.revision, this.drawings.map(drawing => drawing.toEntity()))
  }
}
