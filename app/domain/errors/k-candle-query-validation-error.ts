import { LocalizedError } from '~/domain/errors/localized-error'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/**
 * 哨兵錯誤：使用者自己可以修正的查詢條件錯誤。
 * 帶著出問題的欄位，畫面才能把訊息標在該欄位旁，而不是整塊丟一個紅色區塊。
 */
export class KCandleQueryValidationError extends LocalizedError {
  constructor(
    public readonly field: 'symbol' | 'startTime',
    localizedMessage: LocalizedTextVo,
  ) {
    super(localizedMessage)
    this.name = 'KCandleQueryValidationError'
  }
}
