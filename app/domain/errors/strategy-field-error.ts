/** 策略的輸入欄位。錯誤帶著它，畫面才知道訊息要標在哪一欄旁邊。 */
export type StrategyField = 'name'

/** 哨兵錯誤：使用者自己可以修正的輸入錯誤（欄位層級）。 */
export class StrategyFieldError extends Error {
  constructor(
    public readonly field: StrategyField,
    message: string,
  ) {
    super(message)
    this.name = 'StrategyFieldError'
  }
}
