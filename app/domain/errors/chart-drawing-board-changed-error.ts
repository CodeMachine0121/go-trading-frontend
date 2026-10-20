import { LocalizedError } from '~/domain/errors/localized-error'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'
import type { ChartDrawingBoard } from '~/domain/models/entities/chart-drawing-board'

/** 哨兵錯誤：存回時帳號那一份已經在別處改過了。帶著帳號現在那一份，讓這裡接上之後再存。 */
export class ChartDrawingBoardChangedError extends LocalizedError {
  constructor(
    message: string,
    public readonly currentBoard: ChartDrawingBoard,
    options?: { cause?: unknown },
  ) {
    super(new UntranslatedTextVo(message), options)
    this.name = 'ChartDrawingBoardChangedError'
  }
}
