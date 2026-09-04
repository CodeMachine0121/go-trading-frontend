/** 指標計算的輸入欄位。錯誤帶著它，畫面才知道訊息要標在哪一欄旁邊。 */
/**
 * 這次拒絕是關於畫面上的哪一塊。它決定的是**訊息標在哪裡**——
 * 標錯地方，使用者就會去改一個沒有問題的欄位。
 *
 * `candleCount` 不在裡面：那一格已經不存在，格數是由「要看多長」算出來的。
 */
export type IndicatorCalculationField = 'symbol' | 'span' | 'scriptBody' | 'parameters'

/** 哨兵錯誤：使用者自己可以修正的輸入錯誤（欄位層級）。 */
export class IndicatorCalculationFieldError extends Error {
  constructor(
    public readonly field: IndicatorCalculationField,
    message: string,
  ) {
    super(message)
    this.name = 'IndicatorCalculationFieldError'
  }
}
