/** 策略的輸入欄位。錯誤帶著它，畫面才知道訊息要標在哪一欄旁邊。 */
/**
 * 這次拒絕是關於策略的哪一塊。它決定的是**訊息標在哪裡**——
 * 標錯地方，使用者就會去改一個沒有問題的欄位。
 */
export type StrategyField = 'name' | 'parameters'

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
