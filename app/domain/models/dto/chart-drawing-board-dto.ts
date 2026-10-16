import type { ChartDrawingDto } from '~/domain/models/dto/chart-drawing-dto'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'

/**
 * 一檔的繪圖板：目前的繪圖，加上上一步與下一步各自要回到的樣子。
 *
 * 它是不可變的：每一個動作收一份、交回一份新的。上一步因此不必知道每一種動作怎麼反做——
 * 回到前一份就好。
 */
export class ChartDrawingBoardDto {
  constructor(
    public readonly marketSide: MarketSideVo,
    public readonly symbol: string,
    public readonly drawings: readonly ChartDrawingDto[],
    public readonly undoSnapshots: readonly (readonly ChartDrawingDto[])[],
    public readonly redoSnapshots: readonly (readonly ChartDrawingDto[])[],
  ) {}

  get canUndo(): boolean {
    return this.undoSnapshots.length > 0
  }

  get canRedo(): boolean {
    return this.redoSnapshots.length > 0
  }
}
