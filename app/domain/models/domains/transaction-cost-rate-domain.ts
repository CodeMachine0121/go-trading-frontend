import Decimal from 'decimal.js'

/** 費率的上限：整筆成交金額。正好一百允許——荒謬但算得出來。 */
const WHOLE_NOTIONAL_PERCENTAGE = new Decimal(100)

/** 沒有這一側的收費。零就是沒有——不是「零個百分點那麼便宜」。 */
const NO_RATE = new Decimal(0)

/**
 * Domain Model：一個交易成本費率講不講得通。
 *
 * **它刻意不與 `ExitDistanceDomain` 共用**，儘管兩者擋的都是「負的」與「超過一百」。
 * 差別在那兩句話講的是兩件事：一個超過一百的**距離**會讓價格變成負數；
 * 一個超過一百的**費率**是收得比成交金額本身還多。
 *
 * 共用就得把句子參數化，而拿到錯句子的人會跑去看錯的地方——
 * 一個被告知「價格會變成負數」的人不會想到他填的是手續費。
 * 兩條規則長得像不是把它們變成同一條的理由。
 */
export class TransactionCostRateDomain {
  /**
   * 名字與數字一起進來，與出場距離那一個同一個理由：一個費率「叫什麼」
   * 與它「是多少」是同時知道的兩件事，分開傳會讓同一個費率拿到兩個名字。
   */
  constructor(
    private readonly rate: Decimal,
    private readonly name: string,
  ) {}

  /** 講不通時說出理由；講得通時 `null`。 */
  validationMessage(): string | null {
    if (this.rate.isNaN()) {
      return `${this.name}請填一個數字`
    }

    if (this.rate.isNegative()) {
      return `${this.name}不得為負——負的成本等於交易就送錢`
    }

    if (this.rate.greaterThan(WHOLE_NOTIONAL_PERCENTAGE)) {
      return `${this.name}不得超過 100%——成本不會超過成交金額本身`
    }

    return null
  }

  /**
   * 這一側要不要收費。
   *
   * 用 `greaterThan(0)` 而**不是 `isPositive()`**：`decimal.js` 把零當成正的，
   * 後端的精確小數不是。這個專案為了同一條差別已經付過一次代價——
   * 一組空的設定被前端讀成「有」、被後端讀成「沒有」，兩端對同一份資料
   * 給出兩個答案而沒有任何地方報錯。
   */
  get isSet(): boolean {
    return this.rate.greaterThan(NO_RATE)
  }
}
