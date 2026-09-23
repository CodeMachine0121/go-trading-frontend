import type Decimal from 'decimal.js'
import { KCandle } from '~/domain/models/entities/k-candle'
import { KCandleContractDomain } from '~/domain/models/domains/k-candle-contract-domain'
import type { ContractPriceLineVo } from '~/domain/models/vo/contract-price-line-vo'

/**
 * Entity：一根永續合約 K 線在 domain 內的本體形狀，只有欄位、沒有業務邏輯。
 * 以「合約標的 + 起始時間」唯一辨識；與同名的現貨 K 線是兩個不同商品的兩根 K 線。
 *
 * 成交價那一組與現貨同形，而且合約**每一項都報**——成交額與主動買入量不會沒有值。
 * 另外帶著三條線：
 *
 * - **標記價格**一定在。
 * - **指數價格**與**溢價指數**可以整條不在：開始記錄它們之前存下的舊合約 K 線沒有這兩條。
 *   不在就是 `null`，不是零——零是一個真的讀數，溢價指數更是常常就在零附近。
 */
export class KCandleContract {
  constructor(
    public readonly symbol: string,
    public readonly openTime: Date,
    public readonly open: Decimal,
    public readonly high: Decimal,
    public readonly low: Decimal,
    public readonly close: Decimal,
    public readonly volume: Decimal,
    public readonly quoteVolume: Decimal,
    public readonly takerBuyBaseVolume: Decimal,
    public readonly takerBuyQuoteVolume: Decimal,
    public readonly tradeCount: number,
    public readonly markPriceLine: ContractPriceLineVo,
    public readonly indexPriceLine: ContractPriceLineVo | null,
    public readonly premiumIndexLine: ContractPriceLineVo | null,
  ) {}

  toDomain(): KCandleContractDomain {
    return new KCandleContractDomain(this)
  }

  /**
   * 成交價那一條，當成一根普通的 K 線。
   *
   * 圖上畫的、漲跌判斷的都是成交價，而成交價那一條與現貨的 K 線同形——
   * 轉成一根 K 線之後，畫圖與判斷漲跌用的就是現貨那一套，不另寫第二份。
   */
  toKCandle(): KCandle {
    return new KCandle(
      this.symbol,
      this.openTime,
      this.open,
      this.high,
      this.low,
      this.close,
      this.volume,
      this.quoteVolume,
      this.takerBuyBaseVolume,
      this.takerBuyQuoteVolume,
    )
  }
}
