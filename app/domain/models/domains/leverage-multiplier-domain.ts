import Decimal from 'decimal.js'

/** 不借錢。一倍的部位就是用自己的錢付清的那一個，沒有人會來把它平掉。 */
const NO_LEVERAGE = new Decimal(1)

/**
 * Domain Model：一個槓桿倍數講不講得通，以及它算不算在借錢。
 *
 * **這個專案裡有兩張表單在問同一件事**：一台機器人每一輪要建議的槓桿，
 * 以及一次重演要模擬的槓桿。兩者是不同的東西（前者是建議、存在機器人身上；
 * 後者跟著那一次呼叫走），但**要擋的是同一件事**，而同一個 0.5
 * 在兩張表單上必須得到同一句話。
 *
 * 它從機器人那個模型裡搬出來，與 `ExitDistanceDomain` 當初那一次一模一樣：
 * 那時它只有一個呼叫者，寫在那裡是對的；現在有了第二個，而第二個在另一個模型裡。
 */
export class LeverageMultiplierDomain {
  /**
   * 名字與數字一起進來，與另外兩個共用驗證模型同一個理由：一個數字「叫什麼」
   * 與它「是多少」是同時知道的兩件事，分開傳會讓同一個數字拿到兩個名字。
   */
  constructor(
    private readonly multiplier: Decimal,
    private readonly name: string,
  ) {}

  /** 講不通時說出理由；講得通時 `null`。 */
  validationMessage(): string | null {
    if (this.multiplier.isNaN()) {
      return `${this.name}請填一個數字`
    }

    // 零在這裡**是一個錯誤**，不是「什麼都沒填」。兩張表單對空白的編碼不一樣——
    // 機器人那張把空白讀成一倍，回測那張讀成零——而那是各自表單的事，不是這個倍數的事。
    // 把「零＝留白」寫進這裡，會讓機器人那張表單從此放過一個真的打了 0 的人。
    // 回測那一組自己在問這個模型之前先讓零過去。
    //
    // 不讀成「不上槓桿」：打了 0.5 的人是有意思的（大概是半個部位），
    // 而悄悄讀成一倍會在沒有告知的情況下把他要的部位加倍。
    if (this.multiplier.lessThan(NO_LEVERAGE)) {
      return `${this.name}不得小於 1 倍`
    }

    return null
  }

  /**
   * 有沒有在借錢。
   *
   * **門檻是一，不是零**——這是它與隔壁兩個共用驗證模型唯一的差別，也是最容易抄錯的一行。
   * 出場距離與費率的「沒有」是零；槓桿的「沒有」是**一倍**，因為一倍的部位是用自己的錢
   * 付清的，沒有債主，也就沒有強制平倉這回事。零與留白也都落在這一側。
   *
   * 這裡沒有 `isPositive()` 可以誤用，但同一條教訓仍然適用：一個空輸入框轉成的數字
   * 不是使用者的意思，所以判斷寫在這裡一次，不在每個呼叫端各寫一次。
   */
  get isSet(): boolean {
    return this.multiplier.greaterThan(NO_LEVERAGE)
  }
}
