/**
 * 這次拒絕是關於畫面上的哪一格。它決定的是**訊息標在哪裡**——
 * 標錯地方，使用者就會去改一個沒有問題的欄位。
 */
export type BacktestField
  = 'symbol' | 'timeRange' | 'initialCapital' | 'positionSizingValue' | 'scriptBody'

/** 哨兵錯誤：使用者自己可以修正的輸入錯誤（欄位層級）。 */
export class BacktestFieldError extends Error {
  constructor(
    public readonly field: BacktestField,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'BacktestFieldError'
  }
}
