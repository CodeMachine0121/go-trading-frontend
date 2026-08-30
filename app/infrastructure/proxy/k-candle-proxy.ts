import Decimal from 'decimal.js'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import type { KCandleQueryDomain } from '~/domain/models/domains/k-candle-query-domain'
import type { KCandleWriteDomain } from '~/domain/models/domains/k-candle-write-domain'
import type { KCandleIdentityVo } from '~/domain/models/vo/k-candle-identity-vo'
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

/** 送往後端時的 body 形狀：價量一律以字串傳遞以保留精確度。 */
type KCandleRequest = Record<string, string>

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

    return kCandleWires.map(kCandleWire => this.toKCandle(kCandleWire))
  }

  async saveKCandle(kCandleWriteDomain: KCandleWriteDomain): Promise<KCandle> {
    const kCandleWire = await this.requestBackend<KCandleWire>(K_CANDLES_ENDPOINT, {
      method: 'POST',
      body: this.toRequest(kCandleWriteDomain),
    })

    return this.toKCandle(kCandleWire)
  }

  async updateKCandle(kCandleWriteDomain: KCandleWriteDomain): Promise<KCandle> {
    const kCandleWire = await this.requestBackend<KCandleWire>(
      this.identityPath(kCandleWriteDomain.identity),
      { method: 'PUT', body: this.toRequest(kCandleWriteDomain) },
    )

    return this.toKCandle(kCandleWire)
  }

  async deleteKCandle(kCandleIdentityVo: KCandleIdentityVo): Promise<void> {
    await this.requestBackend<null>(this.identityPath(kCandleIdentityVo), { method: 'DELETE' })
  }

  /** 一根 K 線在後端的位址：以交易標的與起始時間指名。 */
  private identityPath(kCandleIdentityVo: KCandleIdentityVo): string {
    const symbol = encodeURIComponent(kCandleIdentityVo.symbol)
    const openTime = encodeURIComponent(kCandleIdentityVo.openTime.toISOString())

    return `${K_CANDLES_ENDPOINT}/${symbol}/${openTime}`
  }

  private toRequest(kCandleWriteDomain: KCandleWriteDomain): KCandleRequest {
    return {
      symbol: kCandleWriteDomain.identity.symbol,
      openTime: kCandleWriteDomain.identity.openTime.toISOString(),
      open: kCandleWriteDomain.open.toString(),
      high: kCandleWriteDomain.high.toString(),
      low: kCandleWriteDomain.low.toString(),
      close: kCandleWriteDomain.close.toString(),
      volume: kCandleWriteDomain.volume.toString(),
      quoteVolume: kCandleWriteDomain.quoteVolume.toString(),
      takerBuyBaseVolume: kCandleWriteDomain.takerBuyBaseVolume.toString(),
      takerBuyQuoteVolume: kCandleWriteDomain.takerBuyQuoteVolume.toString(),
    }
  }

  private toKCandle(kCandleWire: KCandleWire): KCandle {
    return new KCandle(
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
    )
  }
}
