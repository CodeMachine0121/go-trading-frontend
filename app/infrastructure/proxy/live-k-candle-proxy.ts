import Decimal from 'decimal.js'
import type { ILiveKCandleProxy } from '~/domain/interface/i-live-k-candle-proxy'
import {
  LiveKCandleUpdate,
  type LiveKCandleStatus,
} from '~/domain/models/entities/live-k-candle-update'
import { KCandle } from '~/domain/models/entities/k-candle'

/** 後端送來的原始形狀。只存在於這個檔案內，不匯出、不進 domain。 */
type LiveKCandleUpdateWire = {
  symbol: string
  status: string
  kCandle: {
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
}

/** 後端說得出的五種狀態。認不得的一律當成「即時已停止」——最保守的那一種。 */
const LIVE_K_CANDLE_STATUSES: LiveKCandleStatus[] = [
  'forming', 'closed', 'stalled', 'unavailable', 'marketClosed',
]

/** 這幾種沒有 K 線可談。正面列出來，加一種狀態才不會被默默當成「帶著 K 線」。 */
const CANDLELESS_STATUSES: LiveKCandleStatus[] = ['stalled', 'unavailable', 'marketClosed']

/**
 * Proxy：唯一知道那條持續連著的通道長什麼樣子的地方。
 *
 * 通道本身斷掉時也送出一則「即時已停止」，讓上層只需要認識一種說法：
 * 無論是後端說它跟不動了、還是這條連線自己掉了，對看盤的人都是同一件事。
 */
export class LiveKCandleProxy implements ILiveKCandleProxy {
  constructor(private readonly baseUrl: string) {}

  followKCandles(
    symbol: string, onUpdate: (update: LiveKCandleUpdate) => void,
  ): () => void {
    const source = new EventSource(
      `${this.baseUrl}/k-candles/live?symbol=${encodeURIComponent(symbol)}`)

    source.onmessage = (event: MessageEvent<string>) => {
      const update = this.toUpdate(event.data)
      if (update !== null) {
        onUpdate(update)
      }
    }

    source.onerror = () => {
      onUpdate(new LiveKCandleUpdate(symbol, 'stalled', null))
    }

    return () => source.close()
  }

  /** 讀不懂的一則就當作沒發生：把半根 K 線往內傳，比少一則更糟。 */
  private toUpdate(body: string): LiveKCandleUpdate | null {
    try {
      const wire = JSON.parse(body) as LiveKCandleUpdateWire
      // 認不得的說法一律當成「停了」而不是「沒有」：前者說的是等一下會自己好，
      // 而後端多出一種說法時，讓人多等一會兒遠好過叫他放棄一個其實會回來的畫面。
      const status = LIVE_K_CANDLE_STATUSES.find(known => known === wire.status) ?? 'stalled'
      if (CANDLELESS_STATUSES.includes(status)) {
        return new LiveKCandleUpdate(wire.symbol, status, null)
      }

      return new LiveKCandleUpdate(wire.symbol, status, new KCandle(
        wire.kCandle.symbol,
        new Date(wire.kCandle.openTime),
        new Decimal(wire.kCandle.open),
        new Decimal(wire.kCandle.high),
        new Decimal(wire.kCandle.low),
        new Decimal(wire.kCandle.close),
        new Decimal(wire.kCandle.volume),
        this.readOptionalFigure(wire.kCandle.quoteVolume),
        this.readOptionalFigure(wire.kCandle.takerBuyBaseVolume),
        this.readOptionalFigure(wire.kCandle.takerBuyQuoteVolume),
      ))
    }
    catch (error: unknown) {
      console.warn('讀不懂的即時更新，略過這一則', error)

      return null
    }
  }

  /**
   * 一個市場可能根本不報的成交數字。
   *
   * 後端不帶這一項時它是 null，而 null 必須原樣往內傳——換成 0 的話，
   * 「這個市場不報它」與「這五分鐘沒有成交」就再也分不開了。
   */
  private readOptionalFigure(reported: string | null): Decimal | null {
    return reported === null ? null : new Decimal(reported)
  }
}
