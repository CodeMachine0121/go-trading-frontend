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
    quoteVolume: string
    takerBuyBaseVolume: string
    takerBuyQuoteVolume: string
  }
}

/** 後端說得出的三種狀態。認不得的一律當成「即時已停止」——最保守的那一種。 */
const LIVE_K_CANDLE_STATUSES: LiveKCandleStatus[] = ['forming', 'closed', 'stalled']

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
      const status = LIVE_K_CANDLE_STATUSES.find(known => known === wire.status) ?? 'stalled'
      if (status === 'stalled') {
        return new LiveKCandleUpdate(wire.symbol, 'stalled', null)
      }

      return new LiveKCandleUpdate(wire.symbol, status, new KCandle(
        wire.kCandle.symbol,
        new Date(wire.kCandle.openTime),
        new Decimal(wire.kCandle.open),
        new Decimal(wire.kCandle.high),
        new Decimal(wire.kCandle.low),
        new Decimal(wire.kCandle.close),
        new Decimal(wire.kCandle.volume),
        new Decimal(wire.kCandle.quoteVolume),
        new Decimal(wire.kCandle.takerBuyBaseVolume),
        new Decimal(wire.kCandle.takerBuyQuoteVolume),
      ))
    }
    catch (error: unknown) {
      console.warn('讀不懂的即時更新，略過這一則', error)

      return null
    }
  }
}
