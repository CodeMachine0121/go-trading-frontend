import type Decimal from 'decimal.js'
import { KCandleDomain } from '~/domain/models/domains/k-candle-domain'

/**
 * Entity：一根 K 線在 domain 內的本體形狀，只有欄位、沒有業務邏輯。
 * 一根固定涵蓋五分鐘，以「交易標的 + 起始時間」唯一辨識。
 */
export class KCandle {
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
  ) {}

  toDomain(): KCandleDomain {
    return new KCandleDomain(this)
  }
}
