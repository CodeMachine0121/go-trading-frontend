import type Decimal from 'decimal.js'
import type { KCandleTrendVo } from '~/domain/models/vo/k-candle-trend-vo'
import type { ContractPriceLineVo } from '~/domain/models/vo/contract-price-line-vo'

/**
 * DTO：一根合約 K 線交給 application 與畫面的唯一形狀。
 * 漲跌已經由 domain 照成交價算好，畫面不必也不得自己判斷。
 *
 * 指數價格與溢價指數可以是 `null`——這一根存下時還沒有記錄那一條。
 * 畫面必須把它畫成「沒有這一項」，與 `0` 一眼分得出來。
 */
export class KCandleContractDto {
  constructor(
    public readonly symbol: string,
    public readonly openTime: Date,
    public readonly open: Decimal,
    public readonly high: Decimal,
    public readonly low: Decimal,
    public readonly close: Decimal,
    public readonly volume: Decimal,
    public readonly tradeCount: number,
    public readonly markPriceLine: ContractPriceLineVo,
    public readonly indexPriceLine: ContractPriceLineVo | null,
    public readonly premiumIndexLine: ContractPriceLineVo | null,
    public readonly trend: KCandleTrendVo,
    /** 這一根的成交價漲跌了多少（收盤減開盤）。 */
    public readonly priceChange: Decimal,
    /** 那個漲跌佔開盤價的多少（百分點）。開盤價是零時除不出來，為 `null`。 */
    public readonly priceChangePercent: Decimal | null,
  ) {}
}
