import type { ChartDrawingAnchorVo } from '~/domain/models/vo/chart-drawing-anchor-vo'

export type ChartDrawingCommandKind
  = 'replaceAnchors' | 'cycleLineWidth' | 'cycleLineStyle' | 'changeColor' | 'toggleLocked' | 'toggleVisible'

/**
 * 要對一個繪圖做的一件事。
 *
 * 移動整個與拖一個把手都是 `replaceAnchors`：兩者在業務上是同一件事
 * （錨點換成新的那幾個，鎖定的不能換），差別只在畫面怎麼算出新的錨點。
 */
export class ChartDrawingCommandDto {
  constructor(
    public readonly kind: ChartDrawingCommandKind,
    public readonly anchors: readonly ChartDrawingAnchorVo[] = [],
    public readonly colorToken: string | null = null,
  ) {}
}
