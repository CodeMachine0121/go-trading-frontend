import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { ChartDrawingKindValue } from '~/domain/models/vo/chart-drawing-kind-vo'
import type { ChartCursorStyleValue } from '~/domain/models/vo/chart-cursor-style-vo'

/** 左邊細邊上的一個工具：一種游標樣式，或一種繪圖。 */
export class ChartDrawingToolDto {
  constructor(
    public readonly value: ChartCursorStyleValue | ChartDrawingKindValue,
    public readonly label: LocalizedTextVo,
    public readonly shortcutLabel: string | null,
  ) {}
}
