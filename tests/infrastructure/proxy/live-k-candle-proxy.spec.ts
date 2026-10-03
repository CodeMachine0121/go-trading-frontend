import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LiveKCandleProxy } from '~/infrastructure/proxy/live-k-candle-proxy'
import { BackendRequestHooks } from '~/infrastructure/proxy/backend-request-hooks'
import type { LiveKCandleUpdate } from '~/domain/models/entities/live-k-candle-update'
import type { ISessionStorageProxy } from '~/domain/interface/i-session-storage-proxy'
import { signedInSessionStorage, signedOutSessionStorage } from '../../fixtures/session-storage'

const RECONNECT_DELAY_MILLISECONDS = 3000

/**
 * 後端那一端的串流。測試只寫進原始的位元組，proxy 怎麼切成一則一則是它自己的事——
 * 從外面看到的仍然是「送進什麼、往內傳出什麼」。
 */
function anOpenStream() {
  const channel = new TransformStream<Uint8Array, Uint8Array>()
  const writer = channel.writable.getWriter()
  const encoder = new TextEncoder()

  return {
    response: new Response(channel.readable, {
      status: 200, headers: { 'Content-Type': 'text/event-stream' },
    }),
    writeRaw: (text: string) => writer.write(encoder.encode(text)),
    send: (body: string) => writer.write(encoder.encode(`data: ${body}\n\n`)),
    drop: () => writer.abort(new Error('連線掉了')),
  }
}

function aWireUpdate(status: string, overrides: Record<string, string | null> = {}) {
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

const fetchMock = vi.fn<typeof fetch>()

function requestAt(index: number) {
  const call = fetchMock.mock.calls[index]
  if (call === undefined) {
    throw new Error(`沒有第 ${index + 1} 次連線`)
  }

  return { url: String(call[0]), init: call[1] ?? {} }
}

function follow(
  options: {
    followRoute?: string
    sessionStorage?: ISessionStorageProxy
    hooks?: BackendRequestHooks
  } = {},
) {
  const received: LiveKCandleUpdate[] = []
  const stop = new LiveKCandleProxy(
    'http://backend.test',
    options.followRoute ?? '/k-candles/live',
    options.sessionStorage ?? signedInSessionStorage(),
    options.hooks,
    RECONNECT_DELAY_MILLISECONDS,
  ).followKCandles('BTCUSDT', update => received.push(update))

  return { received, stop }
}

async function followAnOpenStream() {
  const stream = anOpenStream()
  fetchMock.mockResolvedValueOnce(stream.response)
  const following = follow()
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

  return { ...following, stream }
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('跟一個交易標的', () => {
  it('跟的是被指名的那一檔，並帶著這一段登入', async () => {
    await followAnOpenStream()

    const { url, init } = requestAt(0)
    expect(url).toBe('http://backend.test/k-candles/live?symbol=BTCUSDT')
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer a-proof')
  })

  it('沒有記著任何一段登入時不帶身分，而不是帶一個空的', async () => {
    fetchMock.mockResolvedValueOnce(anOpenStream().response)

    follow({ sessionStorage: signedOutSessionStorage() })

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(new Headers(requestAt(0).init.headers).has('Authorization')).toBe(false)
  })

  it('回傳的就是怎麼停：停了之後連線被收掉，也不再說它停了', async () => {
    const { stop, received } = await followAnOpenStream()

    stop()

    expect(requestAt(0).init.signal?.aborted).toBe(true)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(received).toHaveLength(0)
  })
})

describe('把送來的一則收乾淨再往內傳', () => {
  it('數字一律轉成精確小數，時間轉成時刻', async () => {
    const { received, stream } = await followAnOpenStream()

    await stream.send(aWireUpdate('forming'))

    await vi.waitFor(() => expect(received).toHaveLength(1))
    const update = received[0]
    expect(update?.status).toBe('forming')
    expect(update?.kCandle?.openTime.toISOString()).toBe('2026-09-03T10:00:00.000Z')
    expect(update?.kCandle?.open.toString()).toBe('100.5')
    expect(update?.kCandle?.close.toString()).toBe('118.25')
    expect(update?.kCandle?.volume.toString()).toBe('12.5')
    expect(update?.kCandle?.takerBuyQuoteVolume?.toString()).toBe('800.5')
  })

  it('一則被切成兩段送到時，仍然只往內傳一則完整的', async () => {
    const { received, stream } = await followAnOpenStream()
    const body = aWireUpdate('forming')

    await stream.writeRaw(`data: ${body.slice(0, 20)}`)
    await stream.writeRaw(`${body.slice(20)}\n\n`)
    await stream.send(aWireUpdate('closed'))

    await vi.waitFor(() => expect(received).toHaveLength(2))
    expect(received.map(update => update.status)).toEqual(['forming', 'closed'])
  })

  it('走完的那一根照樣往內傳，狀態如實保留', async () => {
    const { received, stream } = await followAnOpenStream()

    await stream.send(aWireUpdate('closed'))

    await vi.waitFor(() => expect(received[0]?.status).toBe('closed'))
  })

  it('說即時已停止的那一則沒有 K 線可談', async () => {
    const { received, stream } = await followAnOpenStream()

    await stream.send(JSON.stringify({ symbol: 'BTCUSDT', status: 'stalled' }))

    await vi.waitFor(() => expect(received[0]?.status).toBe('stalled'))
    expect(received[0]?.kCandle).toBeNull()
  })

  it('認不得的狀態一律當成即時已停止', async () => {
    // 認不得就是不知道它是不是活的，而「假裝還活著」是這裡唯一不能犯的錯。
    const { received, stream } = await followAnOpenStream()

    await stream.send(aWireUpdate('somethingNew'))

    await vi.waitFor(() => expect(received[0]?.status).toBe('stalled'))
  })

  it('讀不懂的那一則就當作沒發生', async () => {
    // 把半根 K 線往內傳，比少一則更糟。
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { received, stream } = await followAnOpenStream()

    await stream.send('這根本不是一則更新')
    await stream.send(aWireUpdate('forming'))

    await vi.waitFor(() => expect(received).toHaveLength(1))
    expect(received[0]?.status).toBe('forming')
  })
})

describe('即時通道對這個市場不報的數字', () => {
  it('後端不帶那一項時原樣傳成沒有值，不換成零', async () => {
    // 換成 0 的話，「這個市場不報它」與「這五分鐘沒有成交」就再也分不開了。
    const { received, stream } = await followAnOpenStream()

    await stream.send(aWireUpdate('forming', {
      quoteVolume: null,
      takerBuyBaseVolume: null,
      takerBuyQuoteVolume: null,
      volume: '0',
    }))

    await vi.waitFor(() => expect(received).toHaveLength(1))
    const update = received[0]
    expect(update?.kCandle?.quoteVolume).toBeNull()
    expect(update?.kCandle?.takerBuyBaseVolume).toBeNull()
    expect(update?.kCandle?.takerBuyQuoteVolume).toBeNull()
    // 成交量真的是零：它有值，只是那個值是零。
    expect(update?.kCandle?.volume.toString()).toBe('0')
  })

  it('這一檔沒有即時更新可給時，那一則沒有 K 線可談', async () => {
    // 它與「停了」是不同的兩件事：這一種不會自己好。
    const { received, stream } = await followAnOpenStream()

    await stream.send(aWireUpdate('unavailable'))

    await vi.waitFor(() => expect(received[0]?.status).toBe('unavailable'))
    expect(received[0]?.kCandle).toBeNull()
  })

  it('市場收盤的那一則原樣帶進來，不被當成認不得而說成停了', async () => {
    // 認不得的狀態會被當成「停了」。收盤若落進那一條路，畫面就會承諾一個
    // 要等到明天才會發生的恢復。
    const { received, stream } = await followAnOpenStream()

    await stream.send(aWireUpdate('marketClosed'))

    await vi.waitFor(() => expect(received[0]?.status).toBe('marketClosed'))
    expect(received[0]?.kCandle).toBeNull()
  })
})

describe('LiveKCandleProxy 跟的是它被交代的那一條', () => {
  it('合約那一條連的是合約的通道，送來的更新照同一份形狀讀', async () => {
    const stream = anOpenStream()
    fetchMock.mockResolvedValueOnce(stream.response)
    const { received } = follow({ followRoute: '/contract-k-candles/live' })
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    await stream.send(aWireUpdate('forming'))

    expect(requestAt(0).url).toBe('http://backend.test/contract-k-candles/live?symbol=BTCUSDT')
    await vi.waitFor(() => expect(received[0]?.status).toBe('forming'))
    expect(received[0]?.kCandle?.close.toString()).toBe('118.25')
  })
})

describe('LiveKCandleProxy 分得出停了與結束了', () => {
  it('連線掉了說停了，之後帶著當下那一份登入重接', async () => {
    vi.useFakeTimers()
    const sessionStorage = signedInSessionStorage('a-proof')
    const first = anOpenStream()
    const second = anOpenStream()
    fetchMock.mockResolvedValueOnce(first.response).mockResolvedValueOnce(second.response)
    const { received } = follow({ sessionStorage })
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    await first.drop()
    await vi.waitFor(() => expect(received.map(update => update.status)).toEqual(['stalled']))
    // 跟了一陣子，登入憑證已經換過一輪。
    vi.mocked(sessionStorage.readSession).mockReturnValue(
      signedInSessionStorage('a-renewed-proof').readSession())
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MILLISECONDS)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(new Headers(requestAt(1).init.headers).get('Authorization')).toBe('Bearer a-renewed-proof')
    await second.send(aWireUpdate('forming'))
    await vi.waitFor(() => expect(received.map(update => update.status)).toEqual(['stalled', 'forming']))
  })

  it('連不上後端也說停了，之後再試', async () => {
    vi.useFakeTimers()
    fetchMock.mockRejectedValueOnce(new TypeError('連不上')).mockResolvedValueOnce(anOpenStream().response)
    const { received } = follow()

    await vi.waitFor(() => expect(received.map(update => update.status)).toEqual(['stalled']))
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MILLISECONDS)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('停了之後就不再重接', async () => {
    vi.useFakeTimers()
    const stream = anOpenStream()
    fetchMock.mockResolvedValueOnce(stream.response)
    const { stop, received } = follow()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    await stream.drop()
    await vi.waitFor(() => expect(received).toHaveLength(1))

    stop()
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MILLISECONDS * 2)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([404, 409, 503])('通道一開始就被拒絕（%i）時說結束了，不再重試', async (status) => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValueOnce(new Response(null, { status }))
    const { received } = follow()

    await vi.waitFor(() => expect(received).toHaveLength(1))
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MILLISECONDS * 2)

    expect(received.map(update => update.status)).toEqual(['ended'])
    expect(received[0]?.kCandle).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('LiveKCandleProxy 遇到登入過期', () => {
  it('救得回這一段登入時，帶著新的那一份再接一次，不說結束了', async () => {
    const sessionStorage = signedInSessionStorage('an-expired-proof')
    const recoverSession = vi.fn(async () => {
      vi.mocked(sessionStorage.readSession).mockReturnValue(
        signedInSessionStorage('a-renewed-proof').readSession())
      return true
    })
    const stream = anOpenStream()
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(stream.response)
    const { received } = follow({ sessionStorage, hooks: new BackendRequestHooks(undefined, recoverSession) })

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await stream.send(aWireUpdate('forming'))

    expect(recoverSession).toHaveBeenCalledTimes(1)
    expect(new Headers(requestAt(1).init.headers).get('Authorization')).toBe('Bearer a-renewed-proof')
    await vi.waitFor(() => expect(received.map(update => update.status)).toEqual(['forming']))
  })

  it('救不回來時說結束了', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }))
    const recoverSession = vi.fn(async () => false)
    const { received } = follow({ hooks: new BackendRequestHooks(undefined, recoverSession) })

    await vi.waitFor(() => expect(received.map(update => update.status)).toEqual(['ended']))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('救回來之後仍被拒絕時說結束了，不再無限地救', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }))
    const recoverSession = vi.fn(async () => true)
    const { received } = follow({ hooks: new BackendRequestHooks(undefined, recoverSession) })

    await vi.waitFor(() => expect(received.map(update => update.status)).toEqual(['ended']))
    expect(recoverSession).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
