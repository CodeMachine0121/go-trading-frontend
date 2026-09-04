/**
 * 算式取用了一個沒有被宣告的參數名字。
 *
 * 它與「算式跑不動」是**兩件不同的事**，要去改的地方也完全不同：
 * 這一則是去改參數那一列的名字，或改算式裡那一行；那一則是去改算法本身。
 * 把前者說成後者，會讓人盯著一段其實沒有問題的程式碼看很久——
 * 而這個錯特別容易犯：改個名字很輕鬆，忘記算式裡還寫著舊的那一行也很輕鬆。
 */
export class StrategyParameterNotDeclaredError extends Error {
  constructor(
    /** 對不上的那個名字。它從回應的一個欄位來，不是從訊息文字裡撈出來的。 */
    public readonly parameterName: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'StrategyParameterNotDeclaredError'
  }
}
