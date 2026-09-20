/**
 * 這次拒絕是關於畫面上的哪一格。它決定的是**訊息標在哪裡**——
 * 標錯地方，使用者就會去改一個沒有問題的欄位。
 */
export type BacktestField
  = 'symbol' | 'timeRange' | 'initialCapital' | 'positionSizingValue' | 'tradingMode'
    | 'script'
  // 出場價位是**一格**，蓋住止損與止盈兩個輸入框：它們併排填成一組，
  // 而拒絕的句子已經說出是哪一個距離。後端也是這樣回的。
    | 'exitLevels'
  // 交易成本也是**一格**，蓋住進場與出場兩個費率，與出場價位同一個判斷：
  // 它們併排填成一組，而拒絕的句子已經說出是哪一個費率。
    | 'transactionCosts'
  // 槓桿也是**一格**，蓋住槓桿倍數與維持保證金率，與上面兩組同一個判斷。
  // 現貨開不了槓桿那一條也落在這裡：使用者要改的是這一組，不是交易模式那一組——
  // 他挑現貨是有意思的，會讓步的是槓桿。
    | 'leverage'

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
