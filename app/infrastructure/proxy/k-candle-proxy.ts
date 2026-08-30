import Decimal from 'decimal.js'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import type { KCandleQueryDomain } from '~/domain/models/domains/k-candle-query-domain'
import { KCandle } from '~/domain/models/entities/k-candle'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const K_CANDLES_ENDPOINT = '/k-candles'

/**
 * 後端回傳的原始 wire 形狀，只存在於本檔內，不外流進 domain。
 * 價量欄位以字串傳遞以保留精確度；時間為世界標準時間的字串。
 */
type KCandleWire = {
  symbol: string
  openTime: string
  open: string
  high: string
  low: string
  close: string
  volume: string
  quoteVolume: string
  takerBuyBaseVolume: string
  takerBuyQuoteVolume: string
}

/** Proxy：唯一允許出現 $fetch 的地方，負責把 wire 形狀收乾淨再往 domain 送。 */
export class KCandleProxy extends BackendApiProxy implements IKCandleProxy {
  async findKCandlesInRange(kCandleQueryDomain: KCandleQueryDomain): Promise<KCandle[]> {
    const kCandleWires = await this.requestBackend<KCandleWire[]>(K_CANDLES_ENDPOINT, {
      query: {
        symbol: kCandleQueryDomain.symbol,
        startTime: kCandleQueryDomain.startTime.toISOString(),
        endTime: kCandleQueryDomain.endTime.toISOString(),
      },
    })

    return kCandleWires.map(kCandleWire => new KCandle(
      kCandleWire.symbol,
      new Date(kCandleWire.openTime),
      new Decimal(kCandleWire.open),
      new Decimal(kCandleWire.high),
      new Decimal(kCandleWire.low),
      new Decimal(kCandleWire.close),
      new Decimal(kCandleWire.volume),
      new Decimal(kCandleWire.quoteVolume),
      new Decimal(kCandleWire.takerBuyBaseVolume),
      new Decimal(kCandleWire.takerBuyQuoteVolume),
    ))
  }
}
