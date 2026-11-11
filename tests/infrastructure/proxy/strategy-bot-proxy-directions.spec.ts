import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StrategyBotProxy } from '~/infrastructure/proxy/strategy-bot-proxy'
import { signedInSessionStorage } from '../../fixtures/session-storage'
import { StrategyBotWriteDomain } from '~/domain/models/domains/strategy-bot-write-domain'
import { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { StrategyBotNotificationsDto } from '~/domain/models/dto/strategy-bot-notifications-dto'
import { StrategyBotTradingDirectionLockedError } from '~/domain/errors/strategy-bot-trading-direction-locked-error'
import type { TradingDirection } from '~/domain/models/vo/trading-direction-vo'

const BASE_URL = 'http://localhost:8080'

function botWire(overrides: Record<string, unknown> = {}) {
  return {
    id: 3,
    name: '費率反轉',
    watchedSymbols: [{ symbol: 'BTCUSDT' }],
    triggerIntervalMinutes: 5,
    tradingStrategyId: 9,
    runState: 'stopped',
    ...overrides,
  }
}

function writeDomainOf(
  tradingDirections: TradingDirection[] | null, notifications: StrategyBotNotificationsDto,
) {
  return new StrategyBotWriteDomain(new StrategyBotWriteDto(
    3, '費率反轉', ['BTCUSDT'], 9, 5, null,
    tradingDirections === null ? 'kCandle' : 'contractKCandle', null, tradingDirections, notifications))
}

function proxy() {
  return new StrategyBotProxy(BASE_URL, signedInSessionStorage())
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('StrategyBotProxy 送出交易方向與通知', () => {
  it('合約機器人送出勾著的交易方向與三個通知', async () => {
    const fetchMock = vi.fn().mockResolvedValue(botWire({ marketDataKind: 'contractKCandle' }))
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().updateStrategyBot(writeDomainOf(['long'], new StrategyBotNotificationsDto(true, true, true)))

    const body = fetchMock.mock.calls[0]![1].body
    expect(body.tradingDirections).toEqual(['long'])
    expect(body.notifications).toEqual({ buy: true, sell: true, hold: true })
  })

  it('現貨機器人不送交易方向，通知照送', async () => {
    const fetchMock = vi.fn().mockResolvedValue(botWire())
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().createStrategyBot(writeDomainOf(null, new StrategyBotNotificationsDto(false, false, false)))

    const body = fetchMock.mock.calls[0]![1].body
    expect(body).not.toHaveProperty('tradingDirections')
    expect(body.notifications).toEqual({ buy: false, sell: false, hold: false })
  })
})

describe('StrategyBotProxy 讀回交易方向與通知', () => {
  it('合約機器人讀回它的交易方向與通知', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(botWire({
      marketDataKind: 'contractKCandle',
      tradingDirections: ['short'],
      notifications: { buy: false, sell: true, hold: true },
    })))

    const bot = await proxy().getStrategyBot(3)

    expect(bot.tradingDirections).toEqual(['short'])
    expect(bot.notifications).toEqual(new StrategyBotNotificationsDto(false, true, true))
  })

  it('交易服務沒說時：合約讀作兩個方向，通知讀作買入開、賣出開、持有關', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(botWire({ marketDataKind: 'contractKCandle' })))

    const bot = await proxy().getStrategyBot(3)

    expect(bot.tradingDirections).toEqual(['long', 'short'])
    expect(bot.notifications).toEqual(new StrategyBotNotificationsDto(true, true, false))
  })

  it('只說了一部分通知：缺的那幾格是預設', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(botWire({ notifications: { hold: true } })))

    expect((await proxy().getStrategyBot(3)).notifications).toEqual(new StrategyBotNotificationsDto(true, true, true))
  })

  it('現貨機器人就算多給了交易方向，也讀成沒有', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(botWire({ tradingDirections: ['long'] })))

    expect((await proxy().getStrategyBot(3)).tradingDirections).toEqual([])
  })
})

describe('StrategyBotProxy 改交易方向被擋下', () => {
  it('自動下單開著（tradingDirectionAutoOrderOn）時說要先到詳細頁關掉自動下單', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(createFetchError({
      request: BASE_URL,
      options: {},
      response: {
        status: 409,
        statusText: 'rejected',
        _data: { message: '自動下單開著時不能改交易方向', reason: 'tradingDirectionAutoOrderOn' },
      },
    } as unknown as FetchContext)))

    const updating = proxy().updateStrategyBot(
      writeDomainOf(['short'], new StrategyBotNotificationsDto()))

    await expect(updating).rejects.toBeInstanceOf(StrategyBotTradingDirectionLockedError)
    await expect(updating).rejects.toMatchObject({
      message: '自動下單開著時不能改交易方向：請先在這台機器人的詳細頁關掉自動下單，再改交易方向',
    })
  })
})
