import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StrategyBotProxy } from '~/infrastructure/proxy/strategy-bot-proxy'
import { signedInSessionStorage, SIGNED_IN_HEADERS } from '../../fixtures/session-storage'
import { StrategyBotWriteDomain } from '~/domain/models/domains/strategy-bot-write-domain'
import { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { StrategyBotNameConflictError } from '~/domain/errors/strategy-bot-name-conflict-error'
import { StrategyBotNotFoundError } from '~/domain/errors/strategy-bot-not-found-error'
import { StrategyBotRunningError } from '~/domain/errors/strategy-bot-running-error'
import { TradingStrategyNotFoundError } from '~/domain/errors/trading-strategy-not-found-error'
import { TelegramNotConfiguredError } from '~/domain/errors/telegram-not-configured-error'

const BASE_URL = 'http://localhost:8080'

function botWire(overrides: Record<string, unknown> = {}) {
  return {
    id: 3,
    name: '早盤突破',
    symbol: 'BTCUSDT',
    triggerIntervalMinutes: 5,
    tradingStrategyId: 9,
    tradingStrategyName: '黃金交叉',
    runState: 'stopped',
    ...overrides,
  }
}

function writeDomainOf(id?: number) {
  return new StrategyBotWriteDomain(
    new StrategyBotWriteDto(id, '早盤突破', 'BTCUSDT', 9, 5))
}

/** 用真正的 FetchError 當替身：它連不上時照樣有 response 屬性，只是值為 undefined。 */
function buildFetchError(failure: { status?: number, message?: string }) {
  const context = failure.status === undefined
    ? { request: BASE_URL, options: {}, error: new Error('fetch failed') }
    : {
        request: BASE_URL,
        options: {},
        response: {
          status: failure.status,
          statusText: 'rejected',
          _data: failure.message === undefined ? undefined : { message: failure.message },
        },
      }

  return createFetchError(context as unknown as FetchContext)
}

function proxy() {
  return new StrategyBotProxy(BASE_URL, signedInSessionStorage())
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('StrategyBotProxy 讀回來的樣子', () => {
  it('把後端給的一台收成領域看得懂的形狀，連它照哪一份規則跑都帶著', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([botWire()]))

    const bots = await proxy().listStrategyBots()

    expect(bots).toHaveLength(1)
    expect(bots[0]?.name).toBe('早盤突破')
    expect(bots[0]?.tradingStrategyId).toBe(9)
    expect(bots[0]?.tradingStrategyName).toBe('黃金交叉')
  })

  it('一台都沒有是空陣列，不是錯誤', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([]))

    expect(await proxy().listStrategyBots()).toEqual([])
  })

  it('打的是機器人端點', async () => {
    const fetchMock = vi.fn().mockResolvedValue([])
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().listStrategyBots()

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/strategy-bots', { headers: SIGNED_IN_HEADERS })
  })

  it('沒送過訊號與沒有停擺都讀成「沒有」', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([botWire()]))

    const bots = await proxy().listStrategyBots()

    expect(bots[0]?.lastSentSignal).toBe('')
    expect(bots[0]?.haltReason).toBeNull()
    expect(bots[0]?.conflicting).toBe(false)
  })
})

describe('StrategyBotProxy 送出去的樣子', () => {
  it('送出去的是規則的名字，不是規則本身', async () => {
    // 一台機器人指名一份交易策略。帶著一份複本出去的話，改那一份就改不到這一台。
    const fetchMock = vi.fn().mockResolvedValue(botWire())
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().createStrategyBot(writeDomainOf())

    const sentBody = fetchMock.mock.calls[0]?.[1]?.body
    expect(sentBody.tradingStrategyId).toBe(9)
    expect(JSON.stringify(sentBody)).not.toContain('buyCondition')
    expect(JSON.stringify(sentBody)).not.toContain('signalSources')
  })

  it('新增打 POST、改寫打 PUT 那一台', async () => {
    const fetchMock = vi.fn().mockResolvedValue(botWire())
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().createStrategyBot(writeDomainOf())
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8080/strategy-bots')
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST')

    await proxy().updateStrategyBot(writeDomainOf(3))
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://localhost:8080/strategy-bots/3')
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe('PUT')
  })

  it('開著與關著打的是同一個子資源的兩個方向', async () => {
    const fetchMock = vi.fn().mockResolvedValue(botWire())
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().startStrategyBot(3)
    await proxy().stopStrategyBot(3)

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8080/strategy-bots/3/power')
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST')
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://localhost:8080/strategy-bots/3/power')
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe('DELETE')
  })

  it('立即運算打的是輪次那一條，不是電源那一條', async () => {
    // 兩條差一個字母而意思完全不同，所以這一條特別釘住。
    const fetchMock = vi.fn().mockResolvedValue(botWire())
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().runRoundNow(3)

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8080/strategy-bots/3/runs')
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST')
  })
})

describe('StrategyBotProxy 把拒絕分成說得出下一步的那幾種', () => {
  it('看不到那一台機器人', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 404, message: '找不到識別碼為 3 的策略機器人' })))

    await expect(proxy().getStrategyBot(3)).rejects.toBeInstanceOf(StrategyBotNotFoundError)
  })

  it('看不到那一份交易策略——它與看不到機器人是兩件事', async () => {
    // 兩者要做的事不同：一個回清單，一個換一支策略腳本。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 404, message: '找不到識別碼為 9 的策略腳本' })))

    await expect(proxy().createStrategyBot(writeDomainOf()))
      .rejects.toBeInstanceOf(TradingStrategyNotFoundError)
  })

  it('名稱撞了——改個名字就能過', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 409, message: '機器人名稱「早盤突破」已被使用' })))

    await expect(proxy().createStrategyBot(writeDomainOf()))
      .rejects.toBeInstanceOf(StrategyBotNameConflictError)
  })

  it('它正在跑——要先按停止，不是改欄位', async () => {
    // 撞名與執行中共用一個狀態碼，所以只能靠訊息分辨；分辨得出來是值得的。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 409, message: '這台機器人正在執行中，要先停止它才改得動' })))

    await expect(proxy().updateStrategyBot(writeDomainOf(3)))
      .rejects.toBeInstanceOf(StrategyBotRunningError)
  })

  it('還沒設定 Telegram——唯一一種要離開這個畫面才解得掉的拒絕', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 400, message: '要先完成 Telegram 設定，這台機器人才送得出訊息' })))

    await expect(proxy().startStrategyBot(3))
      .rejects.toBeInstanceOf(TelegramNotConfiguredError)
  })

  it('其餘的拒絕照原樣往上丟', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 400, message: '同時執行中的機器人上限是 10 台' })))

    await expect(proxy().startStrategyBot(3)).rejects.toThrow('上限是 10 台')
  })
})
