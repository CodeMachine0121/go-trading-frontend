import type { ChartDrawingDto } from '~/domain/models/dto/chart-drawing-dto'
import type { SavedChartDrawingBoardDto } from '~/domain/models/dto/saved-chart-drawing-board-dto'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'

/**
 * 畫面上的一檔繪圖板：帳號那一份、目前的繪圖（含還沒存進去的改動），以及上一步與下一步。
 *
 * 不可變：每一個動作收一份、交回一份新的。
 */
export class ChartDrawingBoardDto {
  constructor(
    public readonly savedBoard: SavedChartDrawingBoardDto,
    public readonly drawings: readonly ChartDrawingDto[],
    public readonly undoSnapshots: readonly (readonly ChartDrawingDto[])[],
    public readonly redoSnapshots: readonly (readonly ChartDrawingDto[])[],
    public readonly hasUnsavedChanges: boolean,
    public readonly assistantDrawingCount: number,
    /** 上一次存回時，哪些編號換成了帳號發的編號（舊 → 新）。 */
    public readonly renumberedDrawingIds: ReadonlyMap<number, number>,
  ) {}

  get marketSide(): MarketSideVo {
    return this.savedBoard.marketSide
  }

  get symbol(): string {
    return this.savedBoard.symbol
  }

  get canUndo(): boolean {
    return this.undoSnapshots.length > 0
  }

  get canRedo(): boolean {
    return this.redoSnapshots.length > 0
  }
}
