import Decimal from 'decimal.js'

/** 沒有意見。留白**不是**關掉它——借了錢就一定有人在看著抵押品。 */
const NO_OPINION = new Decimal(0)

/**
 * Domain Model：一個維持保證金率講不講得通。
 *
 * 它與隔壁兩個共用驗證模型（出場距離、成本費率）最大的差別是**留白的意思**：
 * 那兩個留白是「完全不模擬這件事」，而這一個留白只是「沒有意見」——
 * 只要借了錢，就一定有人在看著抵押品，這不是一件可以不模擬的事。
 * 真正的預設值（0.5%）是**後端的**，畫面只在提示裡說出它，不在請求裡送它。
 *
 * 上限由呼叫端給，因為它是**跨兩格**的：沒有槓桿倍數就算不出這一格能填到多少。
 * 單格模型只回答「這一格自己講不講得通」；跨格的那一條由 `BacktestLeverageDomain` 問。
 */
export class MaintenanceMarginRateDomain {
  /**
   * 名字與數字一起進來，與另外兩個共用驗證模型同一個理由。
   *
   * 上限一併進來，因為「這一格最多能填多少」與「它現在是多少」是同時知道的兩件事——
   * 而拒絕的那句話要同時說出這兩個數字。
   */
  constructor(
    private readonly rate: Decimal,
    private readonly name: string,
    private readonly ceiling: Decimal,
  ) {}

  /**
   * 講不通時說出理由；講得通時 `null`。
   *
   * 上限那一句**說出使用者照著填就會過的數字**，而不只是說他填的不行——
   * 被擋下來的人要知道該改成什麼，而不是自己一個一個試。
   */
  validationMessage(): string | null {
    if (this.rate.isNaN()) {
      return `${this.name}請填一個數字`
    }

    // `!isZero()` because `decimal.js` calls **negative zero** negative and the
    // backend does not — and `-0` is a legal thing to leave in a number input on
    // the way to typing something else. Refusing it would be this layer inventing
    // a rule the authority does not have, on a value that is simply zero. Same
    // sign trap the two sibling validators warn about, other end of it.
    if (this.rate.isNegative() && !this.rate.isZero()) {
      return `${this.name}不得為負——負的維持保證金等於倉位賠光了還撐得住`
    }

    if (this.rate.greaterThanOrEqualTo(this.ceiling)) {
      // Cut down to four significant digits, **rounded down**, so the number in
      // the sentence is one they can actually type: a third of a hundred prints
      // as 33.33, and 33.33 really is under the ceiling. Printed in full it comes
      // out as 33.333333333333333333 — twenty digits of "here is what to type",
      // which is not an instruction anybody can follow.
      return `${this.name}必須小於 ${
        this.ceiling.toSignificantDigits(4, Decimal.ROUND_DOWN).toString()}%`
        + `——押下去的錢只夠讓價格逆著走這麼多，再多這一注在開倉那一棒就已經撐不住`
    }

    return null
  }

  /** 有沒有說過話。留白時這一格不上線，由後端給它的預設值。 */
  get isSet(): boolean {
    return this.rate.greaterThan(NO_OPINION)
  }
}
