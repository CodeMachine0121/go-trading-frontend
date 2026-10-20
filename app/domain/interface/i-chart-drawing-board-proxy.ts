import type { ChartDrawingBoard } from '~/domain/models/entities/chart-drawing-board'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'

/**
 * 帳號裡的繪圖板：讀一邊一檔的那一份、整份存回、移除助手畫的全部。
 *
 * 存回時帳號那一份已經改過，拋出 `ChartDrawingBoardChangedError`（帶著現在那一份）。
 */
export interface IChartDrawingBoardProxy {
  fetchBoard(marketSide: MarketSideVo, symbol: string): Promise<ChartDrawingBoard>
  saveBoard(board: ChartDrawingBoard): Promise<ChartDrawingBoard>
  /** 交回移除了幾個。 */
  removeAssistantDrawings(marketSide: MarketSideVo, symbol: string): Promise<number>
}
