import type { SavedChartDrawingBoardDto } from '~/domain/models/dto/saved-chart-drawing-board-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/** 讀回帳號那一份的結果，以及這一次有沒有把這台裝置上的舊繪圖搬進帳號。 */
export class ChartDrawingBoardLoadDto {
  constructor(
    public readonly savedBoard: SavedChartDrawingBoardDto,
    public readonly migratedDrawingCount: number,
    /** 搬的時候沒成功的原因；沒搬或搬成功時是 `null`。 */
    public readonly migrationFailure: LocalizedTextVo | null,
  ) {}
}
