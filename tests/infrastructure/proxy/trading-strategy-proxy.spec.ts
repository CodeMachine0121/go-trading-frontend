import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TradingStrategyProxy } from '~/infrastructure/proxy/trading-strategy-proxy'
import { signedInSessionStorage, SIGNED_IN_HEADERS } from '../../fixtures/session-storage'
import { TradingStrategyWriteDomain } from '~/domain/models/domains/trading-strategy-write-domain'
import { TradingStrategyConditionDto } from '~/domain/models/dto/trading-strategy-condition-dto'
import { TradingStrategySignalSourceDto } from '~/domain/models/dto/trading-strategy-signal-source-dto'
import { TradingStrategyWriteDto } from '~/domain/models/dto/trading-strategy-write-dto'
import { TradingStrategyBotRunningError } from '~/domain/errors/trading-strategy-bot-running-error'
import { TradingStrategyInUseError } from '~/domain/errors/trading-strategy-in-use-error'
import { TradingStrategyNameConflictError } from '~/domain/errors/trading-strategy-name-conflict-error'
import { TradingStrategyNotFoundError } from '~/domain/errors/trading-strategy-not-found-error'
import { StrategyScriptNotFoundError } from '~/domain/errors/strategy-script-not-found-error'
import type { TradingMode } from '~/domain/models/vo/trading-mode-vo'

const BASE_URL = 'http://localhost:8080'

function tradingStrategyWire(overrides: Record<string, unknown> = {}) {
  return {
    id: 3,
    name: '黃金交叉',
    signalSources: [{
      label: 'A', strategyScriptId: 9, aggregationInterval: '1h',
      parameterValues: [{ name: '回看根數', value: 20 }],
    }],
    buyCondition: {
      operator: 'and',
      conditions: [
        { sourceLabel: 'A', signal: 'buy' },
        { sourceLabel: 'B', signal: 'buy' },
      ],
    },
    sellCondition: { sourceLabel: 'A', signal: 'sell' },
    ...overrides,
  }
}

function writeDomainOf(id?: number, tradingMode: TradingMode = 'longShort') {
  return new TradingStrategyWriteDomain(new TradingStrategyWriteDto(
    id, '黃金交叉', tradingMode,
    [new TradingStrategySignalSourceDto('A', 9, '1h', [])],
    new TradingStrategyConditionDto('n1', 'and', [
      new TradingStrategyConditionDto('n2', null, [], 'A', 'buy'),
      new TradingStrategyConditionDto('n3', null, [], 'A', 'sell'),
    ], '', ''),
    new TradingStrategyConditionDto('n4', null, [], 'A', 'sell'),
  ))
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
  return new TradingStrategyProxy(BASE_URL, signedInSessionStorage())
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TradingStrategyProxy 讀回來的樣子', () => {
  it('把後端給的一份收成領域看得懂的形狀，條件的巢狀原樣留著', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([tradingStrategyWire()]))

    const tradingStrategies = await proxy().listTradingStrategies()

    expect(tradingStrategies).toHaveLength(1)
    expect(tradingStrategies[0]?.name).toBe('黃金交叉')
    expect(tradingStrategies[0]?.signalSources[0]?.aggregationInterval).toBe('1h')
    expect(tradingStrategies[0]?.signalSources[0]?.parameterValues[0]?.value).toBe(20)
    expect(tradingStrategies[0]?.buyCondition?.operator).toBe('and')
    expect(tradingStrategies[0]?.buyCondition?.conditions).toHaveLength(2)
    expect(tradingStrategies[0]?.sellCondition?.sourceLabel).toBe('A')
  })

  it('一份都沒有是空陣列，不是錯誤', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([]))

    expect(await proxy().listTradingStrategies()).toEqual([])
  })

  it('打的是交易策略端點', async () => {
    const fetchMock = vi.fn().mockResolvedValue([])
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().listTradingStrategies()

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/trading-strategies', { headers: SIGNED_IN_HEADERS })
  })

  it('什麼都沒有的那一個條件讀成「沒有條件」', async () => {
    // 留著它的話，畫面會畫出一個既不能編也不能刪的空框。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([tradingStrategyWire({ buyCondition: {} })]))

    const tradingStrategies = await proxy().listTradingStrategies()

    expect(tradingStrategies[0]?.buyCondition).toBeNull()
  })
})

describe('TradingStrategyProxy 送出去的樣子', () => {
  it('條件送出去時不帶畫面用的節點識別碼', async () => {
    // 那個識別碼只活在這一側。順手送過去的話，它會變成一份沒有人宣告過、
    // 卻兩邊都在傳的資料。
    const fetchMock = vi.fn().mockResolvedValue(tradingStrategyWire())
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().createTradingStrategy(writeDomainOf())

    const sentBody = fetchMock.mock.calls[0]?.[1]?.body
    expect(JSON.stringify(sentBody)).not.toContain('nodeId')
    expect(sentBody.buyCondition.operator).toBe('and')
    expect(sentBody.buyCondition.conditions).toHaveLength(2)
    expect(sentBody.sellCondition.sourceLabel).toBe('A')
  })

  it('送出去的那一份沒有交易標的，也沒有觸發間隔', async () => {
    // 那兩樣是機器的事。帶出去的話，同一份規則就再也不能被兩台機器人共用。
    const fetchMock = vi.fn().mockResolvedValue(tradingStrategyWire())
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().createTradingStrategy(writeDomainOf())

    const sentBody = fetchMock.mock.calls[0]?.[1]?.body
    expect(sentBody).not.toHaveProperty('symbol')
    expect(sentBody).not.toHaveProperty('triggerIntervalMinutes')
  })

  it('新增打 POST、改寫打 PUT 那一份', async () => {
    const fetchMock = vi.fn().mockResolvedValue(tradingStrategyWire())
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().createTradingStrategy(writeDomainOf())
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8080/trading-strategies')
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST')

    await proxy().updateTradingStrategy(writeDomainOf(3))
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://localhost:8080/trading-strategies/3')
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe('PUT')
  })
})

describe('TradingStrategyProxy 把拒絕翻成該做什麼', () => {
  it.each([
    ['看不到那一份', 404, '找不到識別碼為 3 的交易策略', TradingStrategyNotFoundError],
    ['看不到那一支策略腳本', 404, '找不到識別碼為 9 的策略腳本', StrategyScriptNotFoundError],
    ['名稱撞了', 409, '交易策略名稱「黃金交叉」已被使用', TradingStrategyNameConflictError],
    ['還有機器人在用它', 409, '還有 1 台機器人正在用它', TradingStrategyInUseError],
    ['有機器人在跑', 409, '這幾台機器人正在用它跑：幣安盯盤，請先停止它們', TradingStrategyBotRunningError],
  ])('%s', async (_situation, status, message, expectedError) => {
    // 五種分開，是因為它們要使用者做的事完全不同：改名字、換一支腳本、
    // 去處理幾台機器人、去停一台機器人。合成一句「請求被拒絕」就沒有人知道該往哪走。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({ status, message })))

    await expect(proxy().getTradingStrategy(3)).rejects.toBeInstanceOf(expectedError)
  })

  it('其餘的拒絕照原樣往上丟', async () => {
    // 一個猜錯的翻譯，比一句原話更難查。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({ status: 500 })))

    await expect(proxy().getTradingStrategy(3)).rejects.not.toBeInstanceOf(
      TradingStrategyNotFoundError)
  })
})

// 交易模式現在是一份交易策略記著的欄位，所以它必須走完整條路：
// 存進去送得出去、讀回來讀得出來。
describe('TradingStrategyProxy 帶著交易模式進出', () => {
  it('新增與改寫都把交易模式送出去', async () => {
    const fetchMock = vi.fn().mockResolvedValue(tradingStrategyWire({ tradingMode: 'spot' }))
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().createTradingStrategy(writeDomainOf(undefined, 'spot'))
    await proxy().updateTradingStrategy(writeDomainOf(3, 'spot'))

    // 改寫是整份改寫，所以沒有哪個欄位只在其中一條路上送得出去。
    expect(fetchMock.mock.calls[0]![1].body.tradingMode).toBe('spot')
    expect(fetchMock.mock.calls[1]![1].body.tradingMode).toBe('spot')
  })

  it('讀的時候把交易模式讀回來', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(
      tradingStrategyWire({ tradingMode: 'spot' })))

    expect((await proxy().getTradingStrategy(3)).tradingMode).toBe('spot')
  })

  it('讀得回槓桿做多，不會被當成認不得的拼法吞掉', async () => {
    // 認不得的拼法會被讀成預設值，而預設值是**會做空**的那一個。
    // 所以一個沒被列進來的模式不會報錯，只會讓畫面安靜地顯示成多空反手——
    // 一種與他實際帳戶相反的東西。這一條就是在擋那個安靜。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(
      tradingStrategyWire({ tradingMode: 'leveragedLong' })))

    expect((await proxy().getTradingStrategy(3)).tradingMode).toBe('leveragedLong')
  })

  it('後端沒回交易模式時讀作預設值', async () => {
    // 一個還沒認得這個欄位的後端不會回它。讀作預設值，
    // 與後端自己對一份沒填的交易策略的讀法一字不差——
    // 而畫面永遠畫得出那一格，不會出現一個空的選項。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(
      tradingStrategyWire({ tradingMode: undefined })))

    expect((await proxy().getTradingStrategy(3)).tradingMode).toBe('longShort')
  })

  it('後端回了一個認不得的拼法時同樣讀作預設值', async () => {
    // 這一側不是那個規則的家——後端存的時候就擋掉了。這裡要的是
    // 「畫面永遠畫得出來」，而一個畫不出來的值會讓那一格兩顆都沒選。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(
      tradingStrategyWire({ tradingMode: 'dayTrade' })))

    expect((await proxy().getTradingStrategy(3)).tradingMode).toBe('longShort')
  })
})
