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
import Decimal from 'decimal.js'
import { PositionPlanDto } from '~/domain/models/dto/position-plan-dto'

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

function writeDomainOf(id?: number, positionPlan: PositionPlanDto | null = null) {
  return new StrategyBotWriteDomain(
    new StrategyBotWriteDto(id, '早盤突破', 'BTCUSDT', 9, 5, positionPlan))
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

    const bots = await proxy().listStrategyBots('kCandle')

    expect(bots).toHaveLength(1)
    expect(bots[0]?.name).toBe('早盤突破')
    expect(bots[0]?.tradingStrategyId).toBe(9)
    expect(bots[0]?.tradingStrategyName).toBe('黃金交叉')
  })

  it('一台都沒有是空陣列，不是錯誤', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([]))

    expect(await proxy().listStrategyBots('kCandle')).toEqual([])
  })

  it('打的是機器人端點', async () => {
    const fetchMock = vi.fn().mockResolvedValue([])
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().listStrategyBots('kCandle')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/strategy-bots',
      { headers: SIGNED_IN_HEADERS, query: { marketDataKind: 'kCandle' } })
  })

  it('沒送過訊號與沒有停擺都讀成「沒有」', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([botWire()]))

    const bots = await proxy().listStrategyBots('kCandle')

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

// 那五個數字要走完整條路：存進去送得出去、讀回來讀得出來。
describe('StrategyBotProxy 帶著部位規劃進出', () => {
  it('有部位規劃時把那一組送出去', async () => {
    const fetchMock = vi.fn().mockResolvedValue(botWire())
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().createStrategyBot(writeDomainOf(undefined, new PositionPlanDto(
      new Decimal(50000), 'percentage', new Decimal(10),
      new Decimal(3), new Decimal(5))))

    // 金額以字串送，理由與回來時相同：它是精確小數。
    expect(fetchMock.mock.calls[0]![1].body.positionPlan).toEqual({
      capital: '50000',
      sizingMode: 'percentage',
      sizingValue: '10',
      stopLossPercentage: '3',
      takeProfitPercentage: '5',
    })
  })

  it('沒有部位規劃時整個鍵都不放', async () => {
    // 不是放一組零：後端讀零與讀「沒有」是同一件事，但送一組零過去，
    // 讀這段程式的人會以為這一側替他填了什麼。
    const fetchMock = vi.fn().mockResolvedValue(botWire())
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().createStrategyBot(writeDomainOf())

    expect(fetchMock.mock.calls[0]![1].body).not.toHaveProperty('positionPlan')
  })

  it('讀回來時把那一組讀出來，一個舊後端多回的槓桿則丟掉', async () => {
    // 舊的後端還會回它。讀進來就等於讓一個這一側已經不認得的概念
    // 從 wire 溜進 domain——而那正是 proxy 這一層存在的理由。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(botWire({
      positionPlan: {
        capital: '50000',
        sizingMode: 'percentage',
        sizingValue: '10',
        leverage: '3',
        stopLossPercentage: '3',
        takeProfitPercentage: '5',
      },
    })))

    const positionPlan = (await proxy().getStrategyBot(3)).positionPlan

    expect(positionPlan?.capital.toString()).toBe('50000')
    expect(positionPlan?.sizingMode).toBe('percentage')
    expect(positionPlan?.stopLossPercentage.toString()).toBe('3')
    expect(positionPlan?.leverage).toBeNull()
  })

  it.each([
    ['後端完全沒回那一組', undefined],
    ['資金是零', { capital: '0' }],
  ])('%s 就讀作沒有部位規劃', async (_name, positionPlan) => {
    // 資金是那一組的開關，而那是後端的規則——這一側照它講，
    // 不替它補一個預設資金。零也不是「有一組資金為零的規劃」。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(botWire({ positionPlan })))

    expect((await proxy().getStrategyBot(3)).positionPlan).toBeNull()
  })

  it('後端只回資金時，其餘幾格各自讀作它們的預設值', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(botWire({
      positionPlan: { capital: '50000' },
    })))

    const positionPlan = (await proxy().getStrategyBot(3)).positionPlan

    expect(positionPlan?.sizingMode).toBe('allIn')
    expect(positionPlan?.stopLossPercentage.isZero()).toBe(true)
    expect(positionPlan?.takeProfitPercentage.isZero()).toBe(true)
  })
})

// 那一輪建議過的三個數字也要讀得回來，而「沒有」與「零」是兩回事——
// 止損價真的可以是零。
describe('StrategyBotProxy 讀回執行紀錄那三個數字', () => {
  it('建議過的那一輪三個都讀得出來', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([{
      runNumber: 1,
      ranAt: '2026-09-16T05:05:00Z',
      result: 'sell',
      suggestedStake: '5000',
      suggestedStopLossPrice: '66105.915',
      suggestedTakeProfitPrice: '60971.475',
    }]))

    const runRecords = await proxy().listRunRecords(3)

    expect(runRecords[0]?.suggestedStake?.toString()).toBe('5000')
    expect(runRecords[0]?.suggestedStopLossPrice?.toString()).toBe('66105.915')
    expect(runRecords[0]?.suggestedTakeProfitPrice?.toString()).toBe('60971.475')
  })

  it('沒有建議的那一輪三個都是 null', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([{
      runNumber: 1, ranAt: '2026-09-16T05:05:00Z', result: 'hold',
    }]))

    const runRecords = await proxy().listRunRecords(3)

    expect(runRecords[0]?.suggestedStake).toBeNull()
    expect(runRecords[0]?.suggestedStopLossPrice).toBeNull()
    expect(runRecords[0]?.suggestedTakeProfitPrice).toBeNull()
  })

  it('建議過一個零的止損價時讀得出零,而不是讀作沒有', async () => {
    // 距離整個價格那麼遠的止損價正好是零——荒謬但合法，
    // 而把它讀作「沒有」會讓那一輪的歷史少講一件它真的講過的事。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([{
      runNumber: 1,
      ranAt: '2026-09-16T05:05:00Z',
      result: 'buy',
      suggestedStake: '5000',
      suggestedStopLossPrice: '0',
    }]))

    const runRecords = await proxy().listRunRecords(3)

    expect(runRecords[0]?.suggestedStopLossPrice?.toString()).toBe('0')
  })
})

describe('StrategyBotProxy 分得出現貨與合約機器人', () => {
  it.each([
    { marketDataKind: 'kCandle' as const },
    { marketDataKind: 'contractKCandle' as const },
  ])('清單只向後端要 $marketDataKind 那一種', async ({ marketDataKind }) => {
    const fetchMock = vi.fn().mockResolvedValue([])
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().listStrategyBots(marketDataKind)

    expect(fetchMock.mock.calls[0]?.[1]?.query).toEqual({ marketDataKind })
  })

  it.each([
    { name: '後端說合約行情', wire: { marketDataKind: 'contractKCandle' }, expected: 'contractKCandle' },
    { name: '舊版後端沒說即現貨', wire: {}, expected: 'kCandle' },
  ])('$name', async ({ wire, expected }) => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(botWire(wire)))

    expect((await proxy().getStrategyBot(3)).marketDataKind).toBe(expected)
  })

  it.each([
    {
      name: '合約機器人的建議部位連槓桿一起讀回來',
      wire: { marketDataKind: 'contractKCandle', positionPlan: { capital: '1000', sizingMode: 'allIn', sizingValue: '0', stopLossPercentage: '2', takeProfitPercentage: '4', leverage: '5' } },
      capital: '1000', stopLoss: '2', leverage: '5',
    },
    {
      name: '合約機器人沒回槓桿即一倍',
      wire: { marketDataKind: 'contractKCandle', positionPlan: { capital: '1000' } },
      capital: '1000', stopLoss: '0', leverage: '1',
    },
    {
      name: '現貨機器人一律沒有槓桿',
      wire: { positionPlan: { capital: '50000', sizingMode: 'percentage', sizingValue: '10', stopLossPercentage: '3', takeProfitPercentage: '5', leverage: '3' } },
      capital: '50000', stopLoss: '3', leverage: null,
    },
    {
      name: '舊版後端首字大寫的拼法也讀得到',
      wire: { positionPlan: { Capital: '50000', SizingMode: 'percentage', SizingValue: '10', StopLossPercentage: '3', TakeProfitPercentage: '5' } },
      capital: '50000', stopLoss: '3', leverage: null,
    },
  ])('$name', async ({ wire, capital, stopLoss, leverage }) => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(botWire(wire)))

    const positionPlan = (await proxy().getStrategyBot(3)).positionPlan

    expect(positionPlan?.capital.toString()).toBe(capital)
    expect(positionPlan?.stopLossPercentage.toString()).toBe(stopLoss)
    expect(positionPlan?.leverage?.toString() ?? null).toBe(leverage)
  })

  it.each([
    { name: '合約機器人送出種類與槓桿', marketDataKind: 'contractKCandle' as const, leverage: new Decimal(5), sentLeverage: '5' },
    { name: '現貨機器人不送槓桿那一格', marketDataKind: 'kCandle' as const, leverage: null, sentLeverage: undefined },
  ])('$name', async ({ marketDataKind, leverage, sentLeverage }) => {
    const fetchMock = vi.fn().mockResolvedValue(botWire())
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().createStrategyBot(new StrategyBotWriteDomain(new StrategyBotWriteDto(
      undefined, '費率反轉', 'BTCUSDT', 9, 5,
      new PositionPlanDto(new Decimal(1000), 'allIn', new Decimal(0), new Decimal(2), new Decimal(4), leverage),
      marketDataKind)))

    const sentBody = fetchMock.mock.calls[0]?.[1]?.body
    expect(sentBody.marketDataKind).toBe(marketDataKind)
    expect(sentBody.positionPlan.leverage).toBe(sentLeverage)
    expect('leverage' in sentBody.positionPlan).toBe(sentLeverage !== undefined)
  })
})
