import type { MarketplaceListingRowDto } from '~/domain/models/dto/marketplace-listing-row-dto'

/**
 * Domain Model：一句搜尋的字**是什麼意思**。
 *
 * 搜尋看起來只是一行過濾，但那一行裡有五個決定：怎麼切詞、比對哪幾個欄位、大小寫怎麼算、
 * 空白怎麼算、好幾個詞是「全部都要對上」還是「對上一個就算」。每一個都是規則，
 * 而規則寫在畫面上就會在下一個要搜尋的地方被重新猜一次。所以它們都在這裡。
 *
 * 它**不發任何請求**：市集本來就一次全部拿回來，在手上的清單上篩，一發請求都不必多。
 * 真的要送到後端的訊號很明確——市集超過大約兩百張卡。
 */
export class MarketplaceSearchDomain {
  /**
   * 使用者打的那幾個詞，已經正規化過。
   *
   * 切詞與去空白在建構子裡做完，因為那是「這一句話是什麼意思」的一部分，
   * 不是每次比對時要重算的東西。
   */
  private readonly terms: readonly string[]

  constructor(query: string) {
    // 不分大小寫。前後的空白與「只打空白」都不必特別處理：切完之後把空字串丟掉，
    // 前後的空白就自己消失了，而只打空白的那一句會一個詞都不剩——那正是「沒有搜」。
    this.terms = query.toLowerCase().split(/\s+/).filter(term => term !== '')
  }

  /**
   * 這一句話留下哪幾列，順序照交進來的（市集給的順序：最近分享的在前）。
   *
   * 沒有打字就是全部。好幾個詞時**每一個都要對上**，順序不論、不必相鄰、也不必落在同一段
   * 字裡——多打一個詞的用意永遠是縮小範圍；任一個對上就算，會讓打得越多結果越多。
   *
   * 比對的是那一張卡上**看得到的字**：名稱、說明、是誰分享的。指標值種類不比對——
   * 那是一個代號，沒有人會拿它來找東西。
   */
  matching(rows: readonly MarketplaceListingRowDto[]): MarketplaceListingRowDto[] {
    if (this.terms.length === 0) {
      return [...rows]
    }

    return rows.filter((row) => {
      const searchableText = [
        row.strategy.name,
        row.strategy.description,
        row.strategy.publisherEmail,
      ].join('\n').toLowerCase()

      return this.terms.every(term => searchableText.includes(term))
    })
  }
}
