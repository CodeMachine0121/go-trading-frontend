import type { SavedChartDrawingBoardDto } from '~/domain/models/dto/saved-chart-drawing-board-dto'

/** `saved`：存進去了，這是存進去的那一份。`superseded`：帳號那一份已在別處改過，這是現在那一份。 */
export type ChartDrawingSaveOutcome = 'saved' | 'superseded'

export class ChartDrawingSaveDto {
  constructor(
    public readonly outcome: ChartDrawingSaveOutcome,
    public readonly savedBoard: SavedChartDrawingBoardDto,
  ) {}
}
