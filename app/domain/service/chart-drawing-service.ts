import type Decimal from 'decimal.js'
import type { IChartDrawingBoardProxy } from '~/domain/interface/i-chart-drawing-board-proxy'
import type { IDeviceChartDrawingProxy } from '~/domain/interface/i-device-chart-drawing-proxy'
import type { ChartDrawingAnchorDto } from '~/domain/models/dto/chart-drawing-anchor-dto'
import type { ChartDrawingBoardDto } from '~/domain/models/dto/chart-drawing-board-dto'
import type { ChartDrawingCommandDto } from '~/domain/models/dto/chart-drawing-command-dto'
import type { ChartDrawingDto } from '~/domain/models/dto/chart-drawing-dto'
import type { ChartDrawingStrokePointDto } from '~/domain/models/dto/chart-drawing-stroke-point-dto'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { PlacedChartDrawingDto } from '~/domain/models/dto/placed-chart-drawing-dto'
import type { SavedChartDrawingBoardDto } from '~/domain/models/dto/saved-chart-drawing-board-dto'
import type { ChartDrawingAnchorVo } from '~/domain/models/vo/chart-drawing-anchor-vo'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'
import { ChartDrawing } from '~/domain/models/entities/chart-drawing'
import { ChartDrawingBoard } from '~/domain/models/entities/chart-drawing-board'
import { ChartDrawingBoardDomain } from '~/domain/models/domains/chart-drawing-board-domain'
import { KCandleTimelineDomain } from '~/domain/models/domains/k-candle-timeline-domain'
import { FreehandStrokeDomain } from '~/domain/models/domains/freehand-stroke-domain'
import { ChartDrawingBoardLoadDto } from '~/domain/models/dto/chart-drawing-board-load-dto'
import { ChartDrawingSaveDto } from '~/domain/models/dto/chart-drawing-save-dto'
import { ChartDrawingToolDto } from '~/domain/models/dto/chart-drawing-tool-dto'
import { ChartDrawingToolGroupDto } from '~/domain/models/dto/chart-drawing-tool-group-dto'
import { ChartDrawingBoardChangedError } from '~/domain/errors/chart-drawing-board-changed-error'
import { LocalizedError } from '~/domain/errors/localized-error'
import { CHART_CURSOR_STYLES, CURSOR_TOOL_GROUP_LABEL } from '~/domain/models/vo/chart-cursor-style-vo'
import {
  CHART_DRAWING_KINDS,
  CHART_DRAWING_TOOL_GROUPS,
  type ChartDrawingKindValue,
  chartDrawingKindOf,
} from '~/domain/models/vo/chart-drawing-kind-vo'

/**
 * Domain Service：繪圖的編排——讀帳號那一份（必要時搬這台裝置上的舊繪圖）、存回、
 * 接上別處的改動、把繪圖放到一張圖上。各個繪圖動作只算出新的板子，什麼時候存回由畫面決定。
 *
 * 規則都在 Domain Model 裡：一個繪圖能怎麼改在 `ChartDrawingDomain`，
 * 上一步怎麼記在 `ChartDrawingBoardDomain`，第幾根與哪一刻怎麼換在 `KCandleTimelineDomain`。
 */
export class ChartDrawingService {
  constructor(
    private readonly chartDrawingBoardProxy: IChartDrawingBoardProxy,
    private readonly deviceChartDrawingProxy: IDeviceChartDrawingProxy,
  ) {}

  /** 還沒讀回帳號那一份時的空板子：版本 0、沒有繪圖。 */
  openBoard(marketSide: MarketSideVo, symbol: string): ChartDrawingBoardDto {
    return new ChartDrawingBoardDomain(new ChartDrawingBoard(marketSide, symbol, 0, []), [], [], []).toDto()
  }

  /**
   * 讀帳號那一份。帳號那一份從沒存過、而這台裝置有這一邊這一檔的舊繪圖時，先把它們搬進帳號：
   * 搬成功才忘掉舊紀錄；搬不成功時舊紀錄留著，下次打開再試，交回讀到的那一份與原因。
   */
  async loadSavedBoard(marketSide: MarketSideVo, symbol: string): Promise<ChartDrawingBoardLoadDto> {
    const savedBoard = await this.chartDrawingBoardProxy.fetchBoard(marketSide, symbol)
    const deviceDrawings = savedBoard.revision === 0 && savedBoard.drawings.length === 0
      ? this.deviceChartDrawingProxy.readChartDrawings(marketSide, symbol)
      : []
    if (deviceDrawings.length === 0) {
      return new ChartDrawingBoardLoadDto(savedBoard.toDto(), 0, null)
    }

    try {
      const migratedBoard = await this.chartDrawingBoardProxy.saveBoard(new ChartDrawingBoard(
        marketSide, symbol, savedBoard.revision,
        deviceDrawings.map(drawing => drawing.toDomain().numbered(0).toEntity())))
      this.deviceChartDrawingProxy.forgetChartDrawings(marketSide, symbol)

      return new ChartDrawingBoardLoadDto(migratedBoard.toDto(), deviceDrawings.length, null)
    }
    catch (error: unknown) {
      if (!(error instanceof LocalizedError)) {
        throw error
      }

      return new ChartDrawingBoardLoadDto(savedBoard.toDto(), 0, error.localizedMessage)
    }
  }

  /** 把畫面上的繪圖整份存回帳號；帳號那一份已在別處改過時交回現在那一份。 */
  async saveBoard(board: ChartDrawingBoardDto): Promise<ChartDrawingSaveDto> {
    try {
      const savedBoard = await this.chartDrawingBoardProxy.saveBoard(this.boardOf(board).toSaveRequest())

      return new ChartDrawingSaveDto('saved', savedBoard.toDto())
    }
    catch (error: unknown) {
      if (error instanceof ChartDrawingBoardChangedError) {
        return new ChartDrawingSaveDto('superseded', error.currentBoard.toDto())
      }

      throw error
    }
  }

  /**
   * 把存回的結果套到目前的板子上：存進去了就換上帳號發的編號與來源；
   * 帳號那一份已在別處改過就接上它（之後還有沒存的，由畫面再存一次）。
   */
  settleSave(board: ChartDrawingBoardDto, sentBoard: ChartDrawingBoardDto, result: ChartDrawingSaveDto): ChartDrawingBoardDto {
    const currentBoard = this.boardOf(board)
    const savedBoard = result.savedBoard.toEntity()

    return (result.outcome === 'saved'
      ? currentBoard.acknowledged(this.boardOf(sentBoard).currentDrawings(), savedBoard)
      : currentBoard.incorporated(savedBoard)
    ).toDto()
  }

  /** 接上帳號裡較新的一份。 */
  incorporateSavedBoard(board: ChartDrawingBoardDto, savedBoard: SavedChartDrawingBoardDto): ChartDrawingBoardDto {
    return this.boardOf(board).incorporated(savedBoard.toEntity()).toDto()
  }

  removeAssistantDrawings(marketSide: MarketSideVo, symbol: string): Promise<number> {
    return this.chartDrawingBoardProxy.removeAssistantDrawings(marketSide, symbol)
  }

  /** 一個還沒放進板子的新繪圖：這種繪圖的預設樣式、實線、沒鎖、看得見。 */
  draftDrawing(kind: ChartDrawingKindValue, anchors: readonly ChartDrawingAnchorVo[]): ChartDrawingDto {
    const kindVo = chartDrawingKindOf(kind)

    return new ChartDrawing(
      0, kindVo.value, [...anchors], kindVo.defaultColorToken, kindVo.defaultLineWidth, 'solid', false, true,
    ).toDomain().toDto()
  }

  /**
   * 按住拖曳到目前為止的一筆自由筆跡：取到的點精簡過、換成那一刻與那個價格，照這種繪圖的預設樣式。
   * 這就是放開時會留下的樣子；不到兩個點時它還不算一個繪圖。
   */
  draftFreehandDrawing(chart: KCandleChartDto, kind: ChartDrawingKindValue, points: readonly ChartDrawingStrokePointDto[]): ChartDrawingDto {
    const kindVo = chartDrawingKindOf(kind)
    const timeline = new KCandleTimelineDomain(chart)
    const anchors = new FreehandStrokeDomain(points, kindVo.maximumAnchorCount).simplified()
      .map(point => timeline.freehandAnchor(point.logicalIndex, point.price).toVo())

    return new ChartDrawing(
      0, kindVo.value, anchors, kindVo.defaultColorToken, kindVo.defaultLineWidth, 'solid', false, true,
    ).toDomain().toDto()
  }

  /** 這個動作套上去會變成什麼樣子，但還不算一步——拖動途中畫給人看的那一份。 */
  previewChange(drawing: ChartDrawingDto, command: ChartDrawingCommandDto): ChartDrawingDto {
    return drawing.toEntity().toDomain().applied(command).toDto()
  }

  addDrawing(board: ChartDrawingBoardDto, drawing: ChartDrawingDto): ChartDrawingBoardDto {
    return this.boardOf(board).added(drawing.toEntity().toDomain()).toDto()
  }

  changeDrawing(board: ChartDrawingBoardDto, id: number, command: ChartDrawingCommandDto): ChartDrawingBoardDto {
    return this.boardOf(board).changed(id, command).toDto()
  }

  removeDrawing(board: ChartDrawingBoardDto, id: number): ChartDrawingBoardDto {
    return this.boardOf(board).removed(id).toDto()
  }

  removeAllDrawings(board: ChartDrawingBoardDto): ChartDrawingBoardDto {
    return this.boardOf(board).removedAll().toDto()
  }

  undo(board: ChartDrawingBoardDto): ChartDrawingBoardDto {
    return this.boardOf(board).undone().toDto()
  }

  redo(board: ChartDrawingBoardDto): ChartDrawingBoardDto {
    return this.boardOf(board).redone().toDto()
  }

  alignAnchor(chart: KCandleChartDto, logicalIndex: number, price: Decimal, magnet: boolean): ChartDrawingAnchorDto {
    return new KCandleTimelineDomain(chart).alignAnchor(logicalIndex, price, magnet)
  }

  shiftAnchor(chart: KCandleChartDto, openTime: Date, kCandleShift: number, price: Decimal): ChartDrawingAnchorDto {
    return new KCandleTimelineDomain(chart).shiftedAnchor(openTime, kCandleShift, price)
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
      board.savedBoard.toEntity(), domainsOf(board.drawings),
      board.undoSnapshots.map(domainsOf), board.redoSnapshots.map(domainsOf))
  }
}
