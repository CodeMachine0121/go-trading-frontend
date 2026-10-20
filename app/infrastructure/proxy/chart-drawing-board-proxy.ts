import Decimal from 'decimal.js'
import type { IChartDrawingBoardProxy } from '~/domain/interface/i-chart-drawing-board-proxy'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'
import type { ChartDrawingKindValue } from '~/domain/models/vo/chart-drawing-kind-vo'
import type { ChartDrawingLineStyle } from '~/domain/models/vo/chart-drawing-line-style-vo'
import { ChartDrawing } from '~/domain/models/entities/chart-drawing'
import { ChartDrawingBoard } from '~/domain/models/entities/chart-drawing-board'
import { ChartDrawingAnchorVo } from '~/domain/models/vo/chart-drawing-anchor-vo'
import { CHART_DRAWING_COLORS } from '~/domain/models/vo/chart-drawing-color-vo'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { ChartDrawingBoardChangedError } from '~/domain/errors/chart-drawing-board-changed-error'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'
import type { BackendRequestBody } from '~/infrastructure/proxy/backend-api-proxy'

const CHART_DRAWINGS_ENDPOINT = '/users/me/chart-drawings'
const CONFLICT_STATUS = 409

type ChartDrawingAnchorWire = { openTime: string, price: string }

type ChartDrawingWire = {
  id: number
  kind: string
  anchors: ChartDrawingAnchorWire[]
  color: string
  lineWidth: number
  lineStyle: string
  locked: boolean
  visible: boolean
  source: string
}

type ChartDrawingBoardWire = {
  market: string
  symbol: string
  revision: number
  drawings: ChartDrawingWire[] | null
}

type ChartDrawingBoardConflictFailure = { data?: { board?: ChartDrawingBoardWire } }

type AssistantDrawingRemovalWire = { removedCount: number }

/** Proxy：帳號裡的繪圖板。線色在帳號裡記的是調色盤名稱，進來時換成畫面的 token。 */
export class ChartDrawingBoardProxy extends BackendApiProxy implements IChartDrawingBoardProxy {
  async fetchBoard(marketSide: MarketSideVo, symbol: string): Promise<ChartDrawingBoard> {
    const boardWire = await this.requestBackend<ChartDrawingBoardWire>(this.boardPath(marketSide, symbol))

    return this.toBoard(marketSide, symbol, boardWire)
  }

  async saveBoard(board: ChartDrawingBoard): Promise<ChartDrawingBoard> {
    const body: BackendRequestBody = {
      revision: board.revision,
      drawings: board.drawings.map(drawing => ({
        ...(drawing.id > 0 ? { id: drawing.id } : {}),
        kind: drawing.kind,
        anchors: drawing.anchors.map(anchor => ({
          openTime: anchor.openTime.toISOString(),
          price: anchor.price.toString(),
        })),
        color: CHART_DRAWING_COLORS.find(color => color.token === drawing.colorToken)?.name ?? drawing.colorToken,
        lineWidth: drawing.lineWidth,
        lineStyle: drawing.lineStyle,
        locked: drawing.locked,
        visible: drawing.visible,
      })),
    }

    try {
      const boardWire = await this.requestBackend<ChartDrawingBoardWire>(
        this.boardPath(board.marketSide, board.symbol), { method: 'PUT', body })

      return this.toBoard(board.marketSide, board.symbol, boardWire)
    }
    catch (error: unknown) {
      const currentBoardWire = error instanceof BackendRequestRejectedError && error.status === CONFLICT_STATUS
        ? (error.cause as ChartDrawingBoardConflictFailure | undefined)?.data?.board
        : undefined
      if (error instanceof BackendRequestRejectedError && currentBoardWire !== undefined) {
        throw new ChartDrawingBoardChangedError(
          error.message, this.toBoard(board.marketSide, board.symbol, currentBoardWire), { cause: error })
      }

      throw error
    }
  }

  async removeAssistantDrawings(marketSide: MarketSideVo, symbol: string): Promise<number> {
    const removalWire = await this.requestBackend<AssistantDrawingRemovalWire>(
      `${this.boardPath(marketSide, symbol)}/assistant-drawings`, { method: 'DELETE' })

    return removalWire.removedCount
  }

  private boardPath(marketSide: MarketSideVo, symbol: string): string {
    return `${CHART_DRAWINGS_ENDPOINT}/${marketSide}/${encodeURIComponent(symbol)}`
  }

  private toBoard(marketSide: MarketSideVo, symbol: string, boardWire: ChartDrawingBoardWire): ChartDrawingBoard {
    return new ChartDrawingBoard(marketSide, symbol, boardWire.revision, (boardWire.drawings ?? []).map(drawingWire =>
      new ChartDrawing(
        drawingWire.id,
        drawingWire.kind as ChartDrawingKindValue,
        drawingWire.anchors.map(anchorWire =>
          new ChartDrawingAnchorVo(new Date(anchorWire.openTime), new Decimal(anchorWire.price))),
        CHART_DRAWING_COLORS.find(color => color.name === drawingWire.color)?.token ?? drawingWire.color,
        drawingWire.lineWidth,
        drawingWire.lineStyle as ChartDrawingLineStyle,
        drawingWire.locked,
        drawingWire.visible,
        drawingWire.source === 'assistant' ? 'assistant' : 'manual',
      )))
  }
}
