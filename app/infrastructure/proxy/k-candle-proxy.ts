import Decimal from 'decimal.js'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import type { KCandleQueryDomain } from '~/domain/models/domains/k-candle-query-domain'
import type { KCandleWriteDomain } from '~/domain/models/domains/k-candle-write-domain'
import type { KCandleIdentityVo } from '~/domain/models/vo/k-candle-identity-vo'
import type { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import { KCandleSeriesVo } from '~/domain/models/vo/k-candle-series-vo'
import { aggregationIntervalOf } from '~/domain/models/vo/aggregation-interval-vo'
import { KCandle } from '~/domain/models/entities/k-candle'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const K_CANDLES_ENDPOINT = '/k-candles'
const K_CANDLE_SERIES_ENDPOINT = '/k-candles/series'
const K_CANDLE_BACKFILL_ENDPOINT = '/k-candles/backfill'

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
  quoteVolume: string | null
  takerBuyBaseVolume: string | null
  takerBuyQuoteVolume: string | null
}

/**
 * 彙總查詢的回覆形狀：一個物件，不是陣列。
 *
 * `interval` 是**必須讀的**：我們送出去的條件裡沒有它，一根多粗是系統挑的，
 * 而畫面要照它標「每根涵蓋」、也要照它分格。交易標的仍然不讀——
 * 那個是我們剛剛問出去的東西，讀它只會讓「手上這批是誰」多一個來源。
 */
type KCandleSeriesWire = {
  interval: string
  kCandles: KCandleWire[]
}

/**
 * 補齊那一輪的回報。逐檔分開，因為那一輪本來就可能不只補一檔——
 * 這裡一次只要一檔，但讀的是同一個形狀，不另外要求後端為這個按鈕變出別的答案。
 */
type KCandleBackfillReportWire = {
  symbolReports: { storedCount: number }[]
}

/**
 * 送往後端時的 body 形狀：價量一律以字串傳遞以保留精確度。
 * 這個市場不報的那幾項送 null——送 '0' 的話它就變成一個真的成交數字了。
 */
type KCandleRequest = Record<string, string | null>

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

  async findKCandleSeries(
    kCandleChartLoadPlanVo: KCandleChartLoadPlanVo,
  ): Promise<KCandleSeriesVo> {
    // 送出去的只有交易標的與那一段的起訖時間。**刻意不送彙總刻度**——
    // 一根該多粗需要交易時段與休市日才算得對，而那是後端知道的事；
    // 說了一種，就等於在這裡長出第二份市場作息。
    const kCandleSeriesWire = await this.requestBackend<KCandleSeriesWire>(
      K_CANDLE_SERIES_ENDPOINT, {
        query: {
          symbol: kCandleChartLoadPlanVo.symbol,
          startTime: kCandleChartLoadPlanVo.fetchStartTime.toISOString(),
          endTime: kCandleChartLoadPlanVo.fetchEndTime.toISOString(),
        },
      })

    return new KCandleSeriesVo(
      kCandleSeriesWire.kCandles.map(kCandleWire => this.toKCandle(kCandleWire)),
      aggregationIntervalOf(kCandleSeriesWire.interval),
    )
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

  async catchUpSymbol(symbol: string): Promise<number> {
    const report = await this.requestBackend<KCandleBackfillReportWire>(
      K_CANDLE_BACKFILL_ENDPOINT, { method: 'POST', body: { symbol } })

    return report.symbolReports.reduce(
      (collected, symbolReport) => collected + symbolReport.storedCount, 0)
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
      quoteVolume: kCandleWriteDomain.quoteVolume?.toString() ?? null,
      takerBuyBaseVolume: kCandleWriteDomain.takerBuyBaseVolume?.toString() ?? null,
      takerBuyQuoteVolume: kCandleWriteDomain.takerBuyQuoteVolume?.toString() ?? null,
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
      this.readOptionalFigure(kCandleWire.quoteVolume),
      this.readOptionalFigure(kCandleWire.takerBuyBaseVolume),
      this.readOptionalFigure(kCandleWire.takerBuyQuoteVolume),
    )
  }

  /**
   * 一個市場可能根本不報的成交數字。
   *
   * 後端不帶這一項時它是 null，而 null 必須原樣往內傳——換成 0 的話，
   * 「這個市場不報它」與「這一分鐘沒有成交」就再也分不開了。
   */
  private readOptionalFigure(reported: string | null): Decimal | null {
    return reported === null ? null : new Decimal(reported)
  }
}
