import type Decimal from 'decimal.js'
import type { KCandleTrendVo } from '~/domain/models/vo/k-candle-trend-vo'

/**
 * DTO：一根 K 線交給 application 與畫面的唯一形狀。
 * 漲跌已經由 domain 算好放在 trend 裡，畫面不必也不得自己判斷。
 *
 * 後三個成交數字可以是 null——這個市場不報這個數字。畫面必須把它畫成
 * 「沒有這一項」，與 `0` 一眼分得出來。
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
    public readonly quoteVolume: Decimal | null,
    public readonly takerBuyBaseVolume: Decimal | null,
    public readonly takerBuyQuoteVolume: Decimal | null,
    public readonly trend: KCandleTrendVo,
    /** 這一根漲跌了多少（收盤減開盤）。與 trend 同一個判斷的兩種說法。 */
    public readonly priceChange: Decimal,
    /** 那個漲跌佔開盤價的多少（百分點）。開盤價是零時除不出來，為 `null`。 */
    public readonly priceChangePercent: Decimal | null,
  ) {}
}
