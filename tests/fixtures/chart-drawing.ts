import Decimal from 'decimal.js'
import { ChartDrawing } from '~/domain/models/entities/chart-drawing'
import { ChartDrawingAnchorVo } from '~/domain/models/vo/chart-drawing-anchor-vo'
import type { ChartDrawingKindValue } from '~/domain/models/vo/chart-drawing-kind-vo'
import type { ChartDrawingLineStyle } from '~/domain/models/vo/chart-drawing-line-style-vo'

export function anchorOf(openTime: string, price: string): ChartDrawingAnchorVo {
  return new ChartDrawingAnchorVo(new Date(openTime), new Decimal(price))
}

/** 一個繪圖；沒說的樣式是藍色、線寬 1、實線、沒鎖、看得見。 */
export function chartDrawingOf(
  id: number,
  kind: ChartDrawingKindValue,
  anchors: ChartDrawingAnchorVo[],
  locked = false,
  lineWidth = 1,
  lineStyle: ChartDrawingLineStyle = 'solid',
): ChartDrawing {
  return new ChartDrawing(id, kind, anchors, '--color-drawing-blue', lineWidth, lineStyle, locked, true)
}

export const TEN_O_CLOCK = '2026-10-16T10:00:00.000Z'
export const ELEVEN_O_CLOCK = '2026-10-16T11:00:00.000Z'
