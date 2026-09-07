import type Decimal from 'decimal.js'
import { KCandleDomain } from '~/domain/models/domains/k-candle-domain'

/**
 * Entity：一根 K 線在 domain 內的本體形狀，只有欄位、沒有業務邏輯。
 * 一根固定涵蓋五分鐘，以「交易標的 + 起始時間」唯一辨識。
 *
 * 後三個成交數字**可以沒有值**——不是每個市場都報這些。沒有值與零是兩回事：
 * 零是「這五分鐘沒有成交」，沒有值是「這個市場不報這個數字」。
 * 把後者寫成零，日後拿它算指標會得到一串看起來合理、實際上全錯的數字。
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
    public readonly quoteVolume: Decimal | null,
    public readonly takerBuyBaseVolume: Decimal | null,
    public readonly takerBuyQuoteVolume: Decimal | null,
  ) {}

  toDomain(): KCandleDomain {
    return new KCandleDomain(this)
  }
}
