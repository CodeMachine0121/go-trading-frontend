import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LiveKCandleProxy } from '~/infrastructure/proxy/live-k-candle-proxy'
import type { LiveKCandleUpdate } from '~/domain/models/entities/live-k-candle-update'

/**
 * 那條通道的替身。只有 proxy 認識它，所以只有這裡需要它——
 * 測試從外面看到的仍然是「送進什麼、往內傳出什麼」。
 */
class FakeEventSource {
  static opened: FakeEventSource[] = []
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onerror: (() => void) | null = null
  closed = false

  constructor(public readonly url: string) {
    FakeEventSource.opened.push(this)
  }

  close() {
    this.closed = true
  }

  send(body: string) {
    this.onmessage?.(new MessageEvent('message', { data: body }))
  }

  fail() {
    this.onerror?.()
  }
}

function aWireUpdate(status: string, overrides: Record<string, string> = {}) {
  return JSON.stringify({
    symbol: 'BTCUSDT',
    status,
    kCandle: {
      symbol: 'BTCUSDT',
      openTime: '2026-09-03T10:00:00Z',
      open: '100.5',
      high: '120',
      low: '90',
      close: '118.25',
      volume: '12.5',
      quoteVolume: '1400.75',
      takerBuyBaseVolume: '7.25',
      takerBuyQuoteVolume: '800.5',
      ...overrides,
    },
  })
}

function follow() {
  const received: LiveKCandleUpdate[] = []
  const stop = new LiveKCandleProxy('http://backend.test')
    .followKCandles('BTCUSDT', update => received.push(update))
  const source = FakeEventSource.opened[FakeEventSource.opened.length - 1]
  if (source === undefined) {
    throw new Error('沒有任何通道被打開')
  }

  return { received, stop, source }
}

beforeEach(() => {
  FakeEventSource.opened = []
  vi.stubGlobal('EventSource', FakeEventSource)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('跟一個交易標的', () => {
  it('跟的是被指名的那一檔', () => {
    const { source } = follow()

    expect(source.url).toBe('http://backend.test/k-candles/live?symbol=BTCUSDT')
  })

  it('回傳的就是怎麼停', () => {
    const { stop, source } = follow()

    stop()

    expect(source.closed).toBe(true)
  })
})

describe('把送來的一則收乾淨再往內傳', () => {
  it('數字一律轉成精確小數，時間轉成時刻', () => {
    const { received, source } = follow()

    source.send(aWireUpdate('forming'))

    const update = received[0]
    expect(update?.status).toBe('forming')
    expect(update?.kCandle?.openTime.toISOString()).toBe('2026-09-03T10:00:00.000Z')
    expect(update?.kCandle?.open.toString()).toBe('100.5')
    expect(update?.kCandle?.close.toString()).toBe('118.25')
    expect(update?.kCandle?.volume.toString()).toBe('12.5')
    expect(update?.kCandle?.takerBuyQuoteVolume.toString()).toBe('800.5')
  })

  it('走完的那一根照樣往內傳，狀態如實保留', () => {
    const { received, source } = follow()

    source.send(aWireUpdate('closed'))

    expect(received[0]?.status).toBe('closed')
  })

  it('說即時已停止的那一則沒有 K 線可談', () => {
    const { received, source } = follow()

    source.send(JSON.stringify({ symbol: 'BTCUSDT', status: 'stalled' }))

    expect(received[0]?.status).toBe('stalled')
    expect(received[0]?.kCandle).toBeNull()
  })

  it('認不得的狀態一律當成即時已停止', () => {
    // 認不得就是不知道它是不是活的，而「假裝還活著」是這裡唯一不能犯的錯。
    const { received, source } = follow()

    source.send(aWireUpdate('somethingNew'))

    expect(received[0]?.status).toBe('stalled')
  })

  it('讀不懂的那一則就當作沒發生', () => {
    // 把半根 K 線往內傳，比少一則更糟。
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { received, source } = follow()

    source.send('這根本不是一則更新')

    expect(received).toHaveLength(0)
  })
})

describe('通道自己掉了', () => {
  it('也算即時已停止', () => {
    // 後端說它跟不動、還是這條連線自己掉了，對看盤的人是同一件事。
    const { received, source } = follow()

    source.fail()

    expect(received[0]?.status).toBe('stalled')
    expect(received[0]?.symbol).toBe('BTCUSDT')
  })
})
