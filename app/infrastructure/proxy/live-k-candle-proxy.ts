import Decimal from 'decimal.js'
import type { ILiveKCandleProxy } from '~/domain/interface/i-live-k-candle-proxy'
import {
  LiveKCandleUpdate,
  type LiveKCandleStatus,
} from '~/domain/models/entities/live-k-candle-update'
import { KCandle } from '~/domain/models/entities/k-candle'
import type { ISessionStorageProxy } from '~/domain/interface/i-session-storage-proxy'
import { BackendRequestHooks } from '~/infrastructure/proxy/backend-request-hooks'

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

const SIGNED_OUT_STATUS = 401

/** 與瀏覽器原生通道掉線後自己重接的間隔相同，看盤的人感覺不到換了實作。 */
const DEFAULT_RECONNECT_DELAY_MILLISECONDS = 3000

/**
 * Proxy：唯一知道那條持續連著的通道長什麼樣子的地方。
 *
 * 通道本身斷掉時也送出一則「即時已停止」，讓上層只需要認識一種說法：
 * 無論是後端說它跟不動了、還是這條連線自己掉了，對看盤的人都是同一件事。
 *
 * 現貨與合約各有一條通道，送來的形狀一字不差，所以是同一個 proxy 的兩個實例、
 * 只差**跟哪一條**——那由組裝根決定，這裡不問自己跟的是現貨還是合約。
 *
 * 不用瀏覽器原生的 `EventSource`：它送不出授權標頭，而跟盤與其他看行情的路一樣要登入。
 * 因此自己用 `fetch` 讀那條串流，連線掉了也由這裡重接——每一次重接都帶著當下那一份登入憑證，
 * 跟了半小時、憑證早已換過一輪也接得回來。
 */
export class LiveKCandleProxy implements ILiveKCandleProxy {
  constructor(
    private readonly baseUrl: string,
    /** 跟盤通道的路由，例如 `/k-candles/live` 或 `/contract-k-candles/live`。 */
    private readonly followRoute: string,
    private readonly sessionStorageProxy: ISessionStorageProxy,
    private readonly hooks: BackendRequestHooks = new BackendRequestHooks(),
    private readonly reconnectDelayMilliseconds: number = DEFAULT_RECONNECT_DELAY_MILLISECONDS,
  ) {}

  followKCandles(
    symbol: string, onUpdate: (update: LiveKCandleUpdate) => void,
  ): () => void {
    const stopping = new AbortController()
    const endpoint = `${this.baseUrl}${this.followRoute}?symbol=${encodeURIComponent(symbol)}`

    // 畫面處理一則更新時出了錯是畫面那一邊的事：記下來、略過這一則，通道照樣開著——
    // 與原生通道對待處理函式出錯的方式相同，也不讓它被當成連線掉了而一再重接。
    const report = (update: LiveKCandleUpdate) => {
      try {
        onUpdate(update)
      }
      catch (error: unknown) {
        // translation-exempt：寫給開發者主控台的紀錄，不是畫面上的話。
        console.warn('處理一則即時更新時出了錯，略過這一則', error)
      }
    }

    // 連線掉了是「停了」，之後自己重接；通道一開始就被拒絕（被擋下、找不到、不在追蹤名單上、
    // 正在關機）是「結束了」，不再重試——兩者要人做的事不同。
    const stall = () => {
      report(new LiveKCandleUpdate(symbol, 'stalled', null))
      const reconnecting = setTimeout(() => void connect(true), this.reconnectDelayMilliseconds)
      stopping.signal.addEventListener('abort', () => clearTimeout(reconnecting), { once: true })
    }

    const end = (response: Response) => {
      void response.body?.cancel().catch(() => {})
      report(new LiveKCandleUpdate(symbol, 'ended', null))
    }

    const connect = async (mayRenew: boolean): Promise<void> => {
      const response = await fetch(endpoint, {
        headers: { Accept: 'text/event-stream', ...this.identityHeaders() },
        signal: stopping.signal,
      }).catch(() => null)
      if (stopping.signal.aborted) {
        return
      }
      if (response === null) {
        stall()
        return
      }

      if (response.status === SIGNED_OUT_STATUS) {
        // 登入憑證十五分鐘就過期：救得回來就帶著新的那一份再接一次，不必叫人重新整理畫面。
        if (mayRenew) {
          void response.body?.cancel().catch(() => {})
          const recovered = await this.hooks.recoverSession()
          if (stopping.signal.aborted) {
            return
          }
          if (recovered) {
            await connect(false)
            return
          }
        }

        // 救不回來了：與其他打後端的路同一個結局。留著那份不算數的登入，
        // 畫面會繼續以為這個人登入著，下一發也照樣被擋。
        this.sessionStorageProxy.clearSession()
        this.hooks.onSignedOut()
        end(response)
        return
      }

      // 原生通道也拒收不是事件串流的回覆（例如前面那一層代答的錯誤頁）：讀下去只會一再重接。
      const isEventStream = response.headers.get('Content-Type')?.startsWith('text/event-stream') ?? false
      if (!response.ok || response.body === null || !isEventStream) {
        end(response)
        return
      }

      // 這裡吞掉的只會是讀串流本身的錯（連線掉了）；畫面那一邊的錯已經在 report 裡收掉。
      await this.readEvents(response.body, (data) => {
        const update = this.toUpdate(data)
        if (update !== null) {
          report(update)
        }
      }).catch(() => {})
      if (!stopping.signal.aborted) {
        stall()
      }
    }

    void connect(true)

    return () => stopping.abort()
  }

  /**
   * 照 Server-Sent Events 的格式把串流切成一則一則：連續的 `data:` 行合成一則，空行送出。
   * 其他欄位（`event:`、`id:`、`retry:`、以 `:` 開頭的註解）後端不送，也用不到，一律略過。
   */
  private async readEvents(
    body: ReadableStream<Uint8Array>, onEvent: (data: string) => void,
  ): Promise<void> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    const dataLines: string[] = []
    let pending = ''

    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      const text = pending + decoder.decode(chunk.value, { stream: true })
      // 結尾的一個 \r 可能是 \r\n 的前半，留到下一段一起切，免得多切出一行空行、把一則拆成兩則。
      const heldBack = text.endsWith('\r') ? '\r' : ''
      const lines = text.slice(0, text.length - heldBack.length).split(/\r\n|\r|\n/)
      pending = (lines.pop() ?? '') + heldBack

      for (const line of lines) {
        if (line === '') {
          if (dataLines.length > 0) {
            onEvent(dataLines.join('\n'))
            dataLines.length = 0
          }
        }
        else if (line.startsWith('data:')) {
          dataLines.push(line.slice('data:'.length).replace(/^ /, ''))
        }
      }
    }
  }

  /** 沒有記著任何一段登入時什麼都不帶，讓後端說「請先登入」，而不是送一個空的憑證。 */
  private identityHeaders(): Record<string, string> {
    const session = this.sessionStorageProxy.readSession()
    if (session === null) {
      return {}
    }

    return { Authorization: `Bearer ${session.accessToken}` }
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
      // translation-exempt：寫給開發者主控台的紀錄，不是畫面上的話。
      console.warn('讀不懂的即時更新，略過這一則', error)

      return null
    }
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
