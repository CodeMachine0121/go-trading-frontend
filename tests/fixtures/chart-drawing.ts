import Decimal from 'decimal.js'
import { ChartDrawing } from '~/domain/models/entities/chart-drawing'
import { ChartDrawingBoard } from '~/domain/models/entities/chart-drawing-board'
import { ChartDrawingAnchorVo } from '~/domain/models/vo/chart-drawing-anchor-vo'
import type { ChartDrawingKindValue } from '~/domain/models/vo/chart-drawing-kind-vo'
import type { ChartDrawingLineStyle } from '~/domain/models/vo/chart-drawing-line-style-vo'
import type { ChartDrawingSourceValue } from '~/domain/models/vo/chart-drawing-source-vo'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'

export function anchorOf(openTime: string, price: string): ChartDrawingAnchorVo {
  return new ChartDrawingAnchorVo(new Date(openTime), new Decimal(price))
}

/** 一個繪圖；沒說的樣式是藍色、線寬 1、實線、沒鎖、看得見、手畫的。 */
export function chartDrawingOf(
  id: number,
  kind: ChartDrawingKindValue,
  anchors: ChartDrawingAnchorVo[],
  locked = false,
  lineWidth = 1,
  lineStyle: ChartDrawingLineStyle = 'solid',
  source: ChartDrawingSourceValue = 'manual',
): ChartDrawing {
  return new ChartDrawing(id, kind, anchors, '--color-drawing-blue', lineWidth, lineStyle, locked, true, source)
}

/** 一條某價格的水平線。 */
export function horizontalLineAt(id: number, price: string, source: ChartDrawingSourceValue = 'manual'): ChartDrawing {
  return chartDrawingOf(id, 'horizontalLine', [anchorOf(TEN_O_CLOCK, price)], false, 1, 'solid', source)
}

/** 帳號裡的那一份；沒說的是現貨 BTCUSDT。 */
export function savedBoardOf(
  revision: number,
  drawings: ChartDrawing[],
  marketSide: MarketSideVo = 'spot',
  symbol = 'BTCUSDT',
): ChartDrawingBoard {
  return new ChartDrawingBoard(marketSide, symbol, revision, drawings)
}

export const TEN_O_CLOCK = '2026-10-16T10:00:00.000Z'
export const ELEVEN_O_CLOCK = '2026-10-16T11:00:00.000Z'
