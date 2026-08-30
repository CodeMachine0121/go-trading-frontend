import type Decimal from 'decimal.js'
import type { KCandleTrendVo } from '~/domain/models/vo/k-candle-trend-vo'

/**
 * DTO：一根 K 線交給 application 與畫面的唯一形狀。
 * 漲跌已經由 domain 算好放在 trend 裡，畫面不必也不得自己判斷。
 */
export class KCandleDto {
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
    public readonly trend: KCandleTrendVo,
  ) {}
}
