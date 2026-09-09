import type Decimal from 'decimal.js'

/**
 * Domain Model：一個市場可能根本不報的成交數字。
 *
 * 它存在的理由只有一個：「沒有」與「零」是兩件不同的事，而它們一旦被寫成同一個
 * 數字就再也分不開。某一分鐘沒有成交，成交量是零；某個市場不公布成交額，
 * 成交額**沒有值**——把後者當成零，日後拿它算指標會得到一整欄看起來合理、
 * 實際上全錯的數字，而且不會有任何地方報錯。
 *
 * 這條分別在兩個地方要用到——合併成更粗的一根、以及畫到畫面上——
 * 所以它住在這裡，而不是在那兩處各判一次。
 */
export class OptionalFigureDomain {
  constructor(private readonly value: Decimal | null) {}

  /**
   * 加上同一個數字的另一次讀數，也就是把幾根合併成一根時做的事。
   *
   * 沒有加上沒有還是沒有：合併一個不公布成交額的市場，不該憑空生出一個成交額。
   * 沒有加上一個數字就是那個數字——那個市場既然報了，把沒報的那幾筆當成零
   * 是唯一不會扔掉已知資訊的讀法。
   */
  plus(added: Decimal | null): OptionalFigureDomain {
    if (added === null) {
      return this
    }

    return new OptionalFigureDomain(
      this.value === null ? added : this.value.plus(added))
  }

  /** 這個數字本身——沒有值就是沒有值。 */
  toValue(): Decimal | null {
    return this.value
  }
}
