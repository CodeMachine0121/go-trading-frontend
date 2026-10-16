import type Decimal from 'decimal.js'
import type { IChartDrawingPreferenceProxy } from '~/domain/interface/i-chart-drawing-preference-proxy'
import type { ChartDrawingAnchorDto } from '~/domain/models/dto/chart-drawing-anchor-dto'
import type { ChartDrawingBoardDto } from '~/domain/models/dto/chart-drawing-board-dto'
import type { ChartDrawingCommandDto } from '~/domain/models/dto/chart-drawing-command-dto'
import type { ChartDrawingDto } from '~/domain/models/dto/chart-drawing-dto'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { PlacedChartDrawingDto } from '~/domain/models/dto/placed-chart-drawing-dto'
import type { ChartDrawingAnchorVo } from '~/domain/models/vo/chart-drawing-anchor-vo'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'
import { ChartDrawing } from '~/domain/models/entities/chart-drawing'
import { ChartDrawingBoardDomain } from '~/domain/models/domains/chart-drawing-board-domain'
import { KCandleTimelineDomain } from '~/domain/models/domains/k-candle-timeline-domain'
import { ChartDrawingToolDto } from '~/domain/models/dto/chart-drawing-tool-dto'
import { ChartDrawingToolGroupDto } from '~/domain/models/dto/chart-drawing-tool-group-dto'
import { CHART_CURSOR_STYLES, CURSOR_TOOL_GROUP_LABEL } from '~/domain/models/vo/chart-cursor-style-vo'
import {
  CHART_DRAWING_KINDS,
  CHART_DRAWING_TOOL_GROUPS,
  type ChartDrawingKindValue,
  chartDrawingKindOf,
} from '~/domain/models/vo/chart-drawing-kind-vo'

/**
 * Domain Service：繪圖的編排——讀留存建板子、每一步做完寫回去、把繪圖放到一張圖上。
 *
 * 規則都在 Domain Model 裡：一個繪圖能怎麼改在 `ChartDrawingDomain`，
 * 上一步怎麼記在 `ChartDrawingBoardDomain`，第幾根與哪一刻怎麼換在 `KCandleTimelineDomain`。
 */
export class ChartDrawingService {
  constructor(private readonly chartDrawingPreferenceProxy: IChartDrawingPreferenceProxy) {}

  loadBoard(marketSide: MarketSideVo, symbol: string): ChartDrawingBoardDto {
    const drawings = this.chartDrawingPreferenceProxy.readChartDrawings(marketSide, symbol)
      .map(drawing => drawing.toDomain())

    return new ChartDrawingBoardDomain(marketSide, symbol, drawings, [], []).toDto()
  }

  /** 一個還沒放進板子的新繪圖：這種繪圖的預設樣式、實線、沒鎖、看得見。 */
  draftDrawing(kind: ChartDrawingKindValue, anchors: readonly ChartDrawingAnchorVo[]): ChartDrawingDto {
    const kindVo = chartDrawingKindOf(kind)

    return new ChartDrawing(
      0, kindVo.value, [...anchors], kindVo.defaultColorToken, kindVo.defaultLineWidth, 'solid', false, true,
    ).toDomain().toDto()
  }

  /** 這個動作套上去會變成什麼樣子，但還不算一步——拖動途中畫給人看的那一份。 */
  previewChange(drawing: ChartDrawingDto, command: ChartDrawingCommandDto): ChartDrawingDto {
    return drawing.toEntity().toDomain().applied(command).toDto()
  }

  addDrawing(board: ChartDrawingBoardDto, drawing: ChartDrawingDto): ChartDrawingBoardDto {
    return this.persisted(this.boardOf(board).added(drawing.toEntity().toDomain()))
  }

  changeDrawing(board: ChartDrawingBoardDto, id: number, command: ChartDrawingCommandDto): ChartDrawingBoardDto {
    return this.persisted(this.boardOf(board).changed(id, command))
  }

  removeDrawing(board: ChartDrawingBoardDto, id: number): ChartDrawingBoardDto {
    return this.persisted(this.boardOf(board).removed(id))
  }

  removeAllDrawings(board: ChartDrawingBoardDto): ChartDrawingBoardDto {
    return this.persisted(this.boardOf(board).removedAll())
  }

  undo(board: ChartDrawingBoardDto): ChartDrawingBoardDto {
    return this.persisted(this.boardOf(board).undone())
  }

  redo(board: ChartDrawingBoardDto): ChartDrawingBoardDto {
    return this.persisted(this.boardOf(board).redone())
  }

  alignAnchor(chart: KCandleChartDto, logicalIndex: number, price: Decimal, magnet: boolean): ChartDrawingAnchorDto {
    return new KCandleTimelineDomain(chart).alignAnchor(logicalIndex, price, magnet)
  }

  placeDrawings(chart: KCandleChartDto, drawings: readonly ChartDrawingDto[]): PlacedChartDrawingDto[] {
    const timeline = new KCandleTimelineDomain(chart)

    return drawings.map(drawing => drawing.toEntity().toDomain().placedOn(timeline, chart.kCandles))
  }

  /** 左邊細邊的五格：游標一格，其餘依繪圖目錄分好。 */
  listToolGroups(): ChartDrawingToolGroupDto[] {
    return [
      new ChartDrawingToolGroupDto('cursor', CURSOR_TOOL_GROUP_LABEL,
        CHART_CURSOR_STYLES.map(style => new ChartDrawingToolDto(style.value, style.label, null))),
      ...CHART_DRAWING_TOOL_GROUPS.map(group => new ChartDrawingToolGroupDto(group.value, group.label,
        CHART_DRAWING_KINDS
          .filter(kind => kind.toolGroup === group.value)
          .map(kind => new ChartDrawingToolDto(kind.value, kind.label, kind.shortcut?.label ?? null)))),
    ]
  }

  /** 按著 ⌥ 時按下的那一個鍵對到哪一種繪圖；對不到時是 `null`。 */
  drawingKindForShortcut(keyCode: string, withShift: boolean): ChartDrawingKindValue | null {
    return CHART_DRAWING_KINDS.find(kind =>
      kind.shortcut?.keyCode === keyCode && kind.shortcut.withShift === withShift)?.value ?? null
  }

  /** 板子的 DTO 換回 Domain Model——每一個動作都從這裡開始。 */
  private boardOf(board: ChartDrawingBoardDto): ChartDrawingBoardDomain {
    const domainsOf = (drawings: readonly ChartDrawingDto[]) => drawings.map(drawing => drawing.toEntity().toDomain())

    return new ChartDrawingBoardDomain(
      board.marketSide, board.symbol, domainsOf(board.drawings),
      board.undoSnapshots.map(domainsOf), board.redoSnapshots.map(domainsOf))
  }

  /** 每一個動作做完都寫回留存，交回新的板子。 */
  private persisted(board: ChartDrawingBoardDomain): ChartDrawingBoardDto {
    const dto = board.toDto()
    this.chartDrawingPreferenceProxy.writeChartDrawings(
      dto.marketSide, dto.symbol, board.currentDrawings().map(drawing => drawing.toEntity()))

    return dto
  }
}
