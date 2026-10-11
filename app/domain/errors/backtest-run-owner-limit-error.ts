import { LocalizedError } from '~/domain/errors/localized-error'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/** 哨兵錯誤：這個人同時排隊中加進行中的輪次已經到了上限，後端說出上限是多少。 */
export class BacktestRunOwnerLimitError extends LocalizedError {
  constructor(public readonly ownerActiveLimit: number, options?: { cause?: unknown }) {
    super(new LocalizedTextVo(
      `你同時最多 ${ownerActiveLimit} 筆，等其中一筆結束再送`,
      `You can have at most ${ownerActiveLimit} backtests queued or running; wait for one to finish`,
    ), { cause: options?.cause })
    this.name = 'BacktestRunOwnerLimitError'
  }
}
