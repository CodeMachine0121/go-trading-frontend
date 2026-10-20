import type { ChartDrawingAnchorVo } from '~/domain/models/vo/chart-drawing-anchor-vo'
import type { ChartDrawingKindValue } from '~/domain/models/vo/chart-drawing-kind-vo'
import type { ChartDrawingLineStyle } from '~/domain/models/vo/chart-drawing-line-style-vo'
import type { ChartDrawingSourceValue } from '~/domain/models/vo/chart-drawing-source-vo'
import { ChartDrawingDomain } from '~/domain/models/domains/chart-drawing-domain'

/** Entity：使用者畫在圖上的一個繪圖，只有欄位。行為在 `ChartDrawingDomain`。 */
export class ChartDrawing {
  constructor(
    public readonly id: number,
    public readonly kind: ChartDrawingKindValue,
    public readonly anchors: ChartDrawingAnchorVo[],
    public readonly colorToken: string,
    public readonly lineWidth: number,
    public readonly lineStyle: ChartDrawingLineStyle,
    public readonly locked: boolean,
    public readonly visible: boolean,
    public readonly source: ChartDrawingSourceValue = 'manual',
  ) {}

  toDomain(): ChartDrawingDomain {
    return new ChartDrawingDomain(this)
  }
}
