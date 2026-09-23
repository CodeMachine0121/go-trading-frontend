import type { KCandleContract } from '~/domain/models/entities/k-candle-contract'
import { KCandleContractDto } from '~/domain/models/dto/k-candle-contract-dto'

/**
 * Domain Model：解讀一根合約 K 線。
 *
 * 漲跌照**成交價**判斷，而且用的是現貨那一套（KCandleDomain）：
 * 一根合約 K 線寫「上漲」還是「下跌」，與同一組成交價的一根現貨 K 線必須是同一個判斷。
 */
export class KCandleContractDomain {
  constructor(private readonly kCandleContract: KCandleContract) {}

  toDto(): KCandleContractDto {
    const tradePriceDomain = this.kCandleContract.toKCandle().toDomain()

    return new KCandleContractDto(
      this.kCandleContract.symbol,
      this.kCandleContract.openTime,
      this.kCandleContract.open,
      this.kCandleContract.high,
      this.kCandleContract.low,
      this.kCandleContract.close,
      this.kCandleContract.volume,
      this.kCandleContract.tradeCount,
      this.kCandleContract.markPriceLine,
      this.kCandleContract.indexPriceLine,
      this.kCandleContract.premiumIndexLine,
      tradePriceDomain.trend(),
      tradePriceDomain.priceChange(),
      tradePriceDomain.priceChangePercent(),
    )
  }
}
