import type { ChartDrawingAnchorVo } from '~/domain/models/vo/chart-drawing-anchor-vo'
import type { ChartDrawingKindValue } from '~/domain/models/vo/chart-drawing-kind-vo'
import type { ChartDrawingLineStyle } from '~/domain/models/vo/chart-drawing-line-style-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { ChartDrawing } from '~/domain/models/entities/chart-drawing'

/** 一個繪圖對外的樣子。 */
export class ChartDrawingDto {
  constructor(
    public readonly id: number,
    public readonly kind: ChartDrawingKindValue,
    public readonly kindLabel: LocalizedTextVo,
    public readonly anchors: readonly ChartDrawingAnchorVo[],
    public readonly colorToken: string,
    public readonly lineWidth: number,
    public readonly lineStyle: ChartDrawingLineStyle,
    public readonly locked: boolean,
    public readonly visible: boolean,
    /** 能不能改線色、線寬與線型。斐波那契回撤與日期與價格範圍不能。 */
    public readonly styleEditable: boolean,
  ) {}

  toEntity(): ChartDrawing {
    return new ChartDrawing(
      this.id, this.kind, [...this.anchors], this.colorToken, this.lineWidth, this.lineStyle,
      this.locked, this.visible)
  }
}
