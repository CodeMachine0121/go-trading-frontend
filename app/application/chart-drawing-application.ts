import type Decimal from 'decimal.js'
import type { ChartDrawingService } from '~/domain/service/chart-drawing-service'
import type { ChartDrawingAnchorDto } from '~/domain/models/dto/chart-drawing-anchor-dto'
import type { ChartDrawingBoardDto } from '~/domain/models/dto/chart-drawing-board-dto'
import type { ChartDrawingCommandDto } from '~/domain/models/dto/chart-drawing-command-dto'
import type { ChartDrawingDto } from '~/domain/models/dto/chart-drawing-dto'
import type { ChartDrawingToolGroupDto } from '~/domain/models/dto/chart-drawing-tool-group-dto'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { PlacedChartDrawingDto } from '~/domain/models/dto/placed-chart-drawing-dto'
import type { ChartDrawingAnchorVo } from '~/domain/models/vo/chart-drawing-anchor-vo'
import type { ChartDrawingKindValue } from '~/domain/models/vo/chart-drawing-kind-vo'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'

/** Application：圖上繪圖的用例編排，全程只碰 DTO。 */
export class ChartDrawingApplication {
  constructor(private readonly chartDrawingService: ChartDrawingService) {}

  loadBoard(marketSide: MarketSideVo, symbol: string): ChartDrawingBoardDto {
    return this.chartDrawingService.loadBoard(marketSide, symbol)
  }

  draftDrawing(kind: ChartDrawingKindValue, anchors: readonly ChartDrawingAnchorVo[]): ChartDrawingDto {
    return this.chartDrawingService.draftDrawing(kind, anchors)
  }

  previewChange(drawing: ChartDrawingDto, command: ChartDrawingCommandDto): ChartDrawingDto {
    return this.chartDrawingService.previewChange(drawing, command)
  }

  addDrawing(board: ChartDrawingBoardDto, drawing: ChartDrawingDto): ChartDrawingBoardDto {
    return this.chartDrawingService.addDrawing(board, drawing)
  }

  changeDrawing(board: ChartDrawingBoardDto, id: number, command: ChartDrawingCommandDto): ChartDrawingBoardDto {
    return this.chartDrawingService.changeDrawing(board, id, command)
  }

  removeDrawing(board: ChartDrawingBoardDto, id: number): ChartDrawingBoardDto {
    return this.chartDrawingService.removeDrawing(board, id)
  }

  removeAllDrawings(board: ChartDrawingBoardDto): ChartDrawingBoardDto {
    return this.chartDrawingService.removeAllDrawings(board)
  }

  undo(board: ChartDrawingBoardDto): ChartDrawingBoardDto {
    return this.chartDrawingService.undo(board)
  }

  redo(board: ChartDrawingBoardDto): ChartDrawingBoardDto {
    return this.chartDrawingService.redo(board)
  }

  alignAnchor(chart: KCandleChartDto, logicalIndex: number, price: Decimal, magnet: boolean): ChartDrawingAnchorDto {
    return this.chartDrawingService.alignAnchor(chart, logicalIndex, price, magnet)
  }

  /** 拖動整個繪圖時，一個錨點平移幾根之後落在哪。 */
  shiftAnchor(chart: KCandleChartDto, openTime: Date, kCandleShift: number, price: Decimal): ChartDrawingAnchorDto {
    return this.chartDrawingService.shiftAnchor(chart, openTime, kCandleShift, price)
  }

  placeDrawings(chart: KCandleChartDto, drawings: readonly ChartDrawingDto[]): PlacedChartDrawingDto[] {
    return this.chartDrawingService.placeDrawings(chart, drawings)
  }

  listToolGroups(): ChartDrawingToolGroupDto[] {
    return this.chartDrawingService.listToolGroups()
  }

  drawingKindForShortcut(keyCode: string, withShift: boolean): ChartDrawingKindValue | null {
    return this.chartDrawingService.drawingKindForShortcut(keyCode, withShift)
  }
}
