/** 目前認得的兩個市場，與後端同名。 */
export type MarketValue = 'taiwanStock' | 'crypto'

/**
 * VO：一個市場。不可變、無行為。
 *
 * 標籤與值一起決定好，因為「這一檔屬於哪個市場」是業務判斷，
 * 而畫面只負責把標籤畫出來——不得自己寫 `market === 'taiwanStock' ? '台股' : ...`，
 * 那樣的翻譯散在幾個元件裡，遲早會有一個沒跟上。
 */
export class MarketVo {
  constructor(
    public readonly value: MarketValue,
    public readonly label: string,
  ) {}
}

/**
 * 認得的每一個市場。順序是**篩選鍵上呈現的順序**，所以多一個市場就是在這裡多一列。
 */
export const MARKETS: MarketVo[] = [
  new MarketVo('taiwanStock', '台股'),
  new MarketVo('crypto', '加密貨幣'),
]

/**
 * 認不得的市場名稱讀成這一個，與後端對「沒有記市場的舊資料」的讀法一致——
 * 一檔標的因為市場名稱沒跟上就整個消失，比它暫時標錯市場糟得多。
 */
export const FALLBACK_MARKET = MARKETS[1]
