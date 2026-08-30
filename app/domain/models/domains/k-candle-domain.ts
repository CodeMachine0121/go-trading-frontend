import type Decimal from 'decimal.js'
import type { KCandle } from '~/domain/models/entities/k-candle'
import { KCandleDto } from '~/domain/models/dto/k-candle-dto'
import { KCandleTrendVo } from '~/domain/models/vo/k-candle-trend-vo'

/**
 * Domain Model：解讀一根 K 線。
 * 漲跌 = 收盤價 - 開盤價，大於零為上漲、小於零為下跌、等於零為持平。
 */
export class KCandleDomain {
  constructor(private readonly kCandle: KCandle) {}

  priceChange(): Decimal {
    return this.kCandle.close.minus(this.kCandle.open)
  }

  trend(): KCandleTrendVo {
    const priceChange = this.priceChange()

    if (priceChange.isPositive() && !priceChange.isZero()) {
      return new KCandleTrendVo('up', '上漲', 'success')
    }
    if (priceChange.isNegative()) {
      return new KCandleTrendVo('down', '下跌', 'danger')
    }
    return new KCandleTrendVo('flat', '持平', 'neutral')
  }

  toDto(): KCandleDto {
    return new KCandleDto(
      this.kCandle.symbol,
      this.kCandle.openTime,
      this.kCandle.open,
      this.kCandle.high,
      this.kCandle.low,
      this.kCandle.close,
      this.kCandle.volume,
      this.kCandle.quoteVolume,
      this.kCandle.takerBuyBaseVolume,
      this.kCandle.takerBuyQuoteVolume,
      this.trend(),
    )
  }
}
