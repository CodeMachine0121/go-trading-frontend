import Decimal from 'decimal.js'

/** 距離的上限：整個價格。正好一百允許——荒謬但算得出來；再多價格會變成負數。 */
const WHOLE_PRICE_PERCENTAGE = new Decimal(100)

/** 沒有這個出場。零就是沒有——不是「零個百分點那麼近」。 */
const NO_DISTANCE = new Decimal(0)

/**
 * Domain Model：一個出場距離講不講得通。
 *
 * **這個專案裡有兩張表單在問同一件事**：一台機器人每一輪要建議的停損停利，
 * 以及一次重演要模擬的止損止盈。兩者是不同的東西（前者從最新價量起、
 * 存在機器人身上；後者從進場價量起、跟著那一次呼叫走），
 * 但**要擋的是同樣兩件事**：負的會跑到價格的另一邊，超過一百會讓價格變成負數。
 *
 * 所以那兩句話只能有一份。多一份的那一天，同一個 150 會在兩張表單上
 * 得到兩種說法——而那不是不一致而已，那是其中一張放過了另一張擋著的值。
 *
 * 它從機器人那個模型的一個私有方法搬出來。那時它只有一個呼叫者，私有是對的；
 * 現在有了第二個，而第二個在另一個模型裡。
 */
export class ExitDistanceDomain {
  /**
   * 名字與數字一起進來，因為一個距離「叫什麼」與它「是多少」是同時知道的兩件事。
   * 分開傳會讓同一個距離在兩次呼叫裡拿到兩個名字。
   */
  constructor(
    private readonly distance: Decimal,
    private readonly name: string,
  ) {}

  /** 講不通時說出理由；講得通時 `null`。 */
  validationMessage(): string | null {
    if (this.distance.isNaN()) {
      return `${this.name}請填一個數字`
    }

    if (this.distance.isNegative()) {
      return `${this.name}不得為負`
    }

    if (this.distance.greaterThan(WHOLE_PRICE_PERCENTAGE)) {
      return `${this.name}不得超過 100%——那會讓價格變成負數`
    }

    return null
  }

  /**
   * 有沒有這個出場。
   *
   * 用 `greaterThan(0)` 而**不是 `isPositive()`**：`decimal.js` 把零當成正的，
   * 後端的精確小數不是。這條分別在這個專案裡踩過一次——一組空的設定被前端讀成
   * 「有」、被後端讀成「沒有」，兩端對同一份資料給出兩個答案而沒有任何地方報錯。
   *
   * 它住在這裡而不是在每個呼叫端各寫一次，就是為了不再有第二個人寫成 `isPositive()`。
   */
  get isSet(): boolean {
    return this.distance.greaterThan(NO_DISTANCE)
  }
}
