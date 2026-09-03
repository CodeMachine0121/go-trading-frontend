/**
 * 哨兵錯誤：使用者自己可以修正的查詢條件錯誤。
 * 帶著出問題的欄位，畫面才能把訊息標在該欄位旁，而不是整塊丟一個紅色區塊。
 */
export class KCandleQueryValidationError extends Error {
  constructor(
    public readonly field: 'symbol' | 'startTime',
    message: string,
  ) {
    super(message)
    this.name = 'KCandleQueryValidationError'
  }
}
