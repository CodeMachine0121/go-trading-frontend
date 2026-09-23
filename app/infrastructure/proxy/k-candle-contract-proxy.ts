import Decimal from 'decimal.js'
import type { IKCandleContractProxy } from '~/domain/interface/i-k-candle-contract-proxy'
import type { KCandleQueryDomain } from '~/domain/models/domains/k-candle-query-domain'
import type { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import { KCandleContractSeriesVo } from '~/domain/models/vo/k-candle-contract-series-vo'
import { ContractPriceLineVo } from '~/domain/models/vo/contract-price-line-vo'
import { aggregationIntervalOf } from '~/domain/models/vo/aggregation-interval-vo'
import { KCandleContract } from '~/domain/models/entities/k-candle-contract'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const K_CANDLE_CONTRACTS_ENDPOINT = '/contract-k-candles'
const K_CANDLE_CONTRACT_SERIES_ENDPOINT = '/contract-k-candles/series'

/**
 * 後端回傳的原始 wire 形狀，只存在於本檔內，不外流進 domain。
 * 價量欄位以字串傳遞以保留精確度；時間為世界標準時間的字串。
 * 指數價格與溢價指數在舊合約 K 線上是 null。
 */
type KCandleContractWire = {
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
  tradeCount: number
  markOpen: string
  markHigh: string
  markLow: string
  markClose: string
  indexOpen: string | null
  indexHigh: string | null
  indexLow: string | null
  indexClose: string | null
  premiumIndexOpen: string | null
  premiumIndexHigh: string | null
  premiumIndexLow: string | null
  premiumIndexClose: string | null
}

/** 彙總查詢的回覆形狀。`interval` 必須讀——畫面標的是系統實際用了哪一種。 */
type KCandleContractSeriesWire = {
  interval: string
  kCandles: KCandleContractWire[]
}

/** Proxy：唯一允許出現 $fetch 的地方，負責把 wire 形狀收乾淨再往 domain 送。 */
export class KCandleContractProxy extends BackendApiProxy implements IKCandleContractProxy {
  async findKCandleContractsInRange(
    kCandleQueryDomain: KCandleQueryDomain,
  ): Promise<KCandleContract[]> {
    const kCandleContractWires = await this.requestBackend<KCandleContractWire[]>(
      K_CANDLE_CONTRACTS_ENDPOINT, {
        query: {
          symbol: kCandleQueryDomain.symbol,
          startTime: kCandleQueryDomain.startTime.toISOString(),
          endTime: kCandleQueryDomain.endTime.toISOString(),
        },
      })

    return kCandleContractWires.map(kCandleContractWire => this.toKCandleContract(kCandleContractWire))
  }

  async findKCandleContractSeries(
    kCandleChartLoadPlanVo: KCandleChartLoadPlanVo,
  ): Promise<KCandleContractSeriesVo> {
    // 與現貨那一條相同：挑「自動」時一個字都不說，整個 key 不放進去。
    const declaredInterval = kCandleChartLoadPlanVo.aggregationIntervalChoice.declaredInterval

    const kCandleContractSeriesWire = await this.requestBackend<KCandleContractSeriesWire>(
      K_CANDLE_CONTRACT_SERIES_ENDPOINT, {
        query: {
          symbol: kCandleChartLoadPlanVo.symbol,
          startTime: kCandleChartLoadPlanVo.fetchStartTime.toISOString(),
          endTime: kCandleChartLoadPlanVo.fetchEndTime.toISOString(),
          ...(declaredInterval === null ? {} : { interval: declaredInterval }),
        },
      })

    return new KCandleContractSeriesVo(
      kCandleContractSeriesWire.kCandles.map(
        kCandleContractWire => this.toKCandleContract(kCandleContractWire)),
      aggregationIntervalOf(kCandleContractSeriesWire.interval),
    )
  }

  private toKCandleContract(kCandleContractWire: KCandleContractWire): KCandleContract {
    return new KCandleContract(
      kCandleContractWire.symbol,
      new Date(kCandleContractWire.openTime),
      new Decimal(kCandleContractWire.open),
      new Decimal(kCandleContractWire.high),
      new Decimal(kCandleContractWire.low),
      new Decimal(kCandleContractWire.close),
      new Decimal(kCandleContractWire.volume),
      new Decimal(kCandleContractWire.quoteVolume),
      new Decimal(kCandleContractWire.takerBuyBaseVolume),
      new Decimal(kCandleContractWire.takerBuyQuoteVolume),
      kCandleContractWire.tradeCount,
      new ContractPriceLineVo(
        new Decimal(kCandleContractWire.markOpen),
        new Decimal(kCandleContractWire.markHigh),
        new Decimal(kCandleContractWire.markLow),
        new Decimal(kCandleContractWire.markClose),
      ),
      this.readOptionalLine(
        kCandleContractWire.indexOpen, kCandleContractWire.indexHigh,
        kCandleContractWire.indexLow, kCandleContractWire.indexClose),
      this.readOptionalLine(
        kCandleContractWire.premiumIndexOpen, kCandleContractWire.premiumIndexHigh,
        kCandleContractWire.premiumIndexLow, kCandleContractWire.premiumIndexClose),
    )
  }

  /**
   * 一條舊合約 K 線上可能沒有的線。
   *
   * 四個數字缺任何一個，整條就當作不在：一條只有收盤的線畫不出來，
   * 而拿零補上缺的那幾個，會變成一根看起來很正常、實際上是捏造的 K 線。
   */
  private readOptionalLine(
    open: string | null, high: string | null, low: string | null, close: string | null,
  ): ContractPriceLineVo | null {
    if (open === null || high === null || low === null || close === null) {
      return null
    }

    return new ContractPriceLineVo(
      new Decimal(open), new Decimal(high), new Decimal(low), new Decimal(close))
  }
}
