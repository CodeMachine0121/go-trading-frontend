import type { ChartDrawingToolDto } from '~/domain/models/dto/chart-drawing-tool-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { ChartDrawingToolGroupValue } from '~/domain/models/vo/chart-drawing-kind-vo'

/** 左邊細邊上的一格：游標、線、斐波那契、形狀、奇異筆或測量。 */
export class ChartDrawingToolGroupDto {
  constructor(
    public readonly value: 'cursor' | ChartDrawingToolGroupValue,
    public readonly label: LocalizedTextVo,
    public readonly tools: readonly ChartDrawingToolDto[],
  ) {}
}
