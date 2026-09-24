import { describe, expect, it, vi } from 'vitest'
import { StrategyBotApplication } from '~/application/strategy-bot-application'
import { StrategyBotService } from '~/domain/service/strategy-bot-service'
import type { IStrategyBotProxy } from '~/domain/interface/i-strategy-bot-proxy'
import { StrategyBot } from '~/domain/models/entities/strategy-bot'
import { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { StrategyBotRejectedError } from '~/domain/errors/strategy-bot-rejected-error'
import { PositionPlanDto } from '~/domain/models/dto/position-plan-dto'
import Decimal from 'decimal.js'

// 只 mock 最外層的 proxy 介面；application、domain service 與每一個 domain model 都是真的。
function buildApplication(strategyBotProxy: Partial<IStrategyBotProxy>): StrategyBotApplication {
  return new StrategyBotApplication(new StrategyBotService({
    listStrategyBots: vi.fn(),
    getStrategyBot: vi.fn(),
    createStrategyBot: vi.fn(),
    updateStrategyBot: vi.fn(),
    deleteStrategyBot: vi.fn(),
    startStrategyBot: vi.fn(),
    stopStrategyBot: vi.fn(),
    runRoundNow: vi.fn(),
    listRunRecords: vi.fn(),
    ...strategyBotProxy,
  }))
}

function storedBot(overrides: Partial<{
  runState: 'running' | 'stopped'
  lastSentSignal: string
  haltReason: string | null
  conflicting: boolean
}> = {}): StrategyBot {
  return new StrategyBot(
    3, '早盤突破', 'BTCUSDT', 5, 9, '黃金交叉',
    overrides.runState ?? 'stopped',
    overrides.lastSentSignal ?? '',
    (overrides.haltReason ?? null) as never,
    overrides.conflicting ?? false,
    null,
  )
}

function aWriteDto(overrides: Partial<{ id: number, name: string }> = {}) {
  return new StrategyBotWriteDto(
    overrides.id,
    overrides.name ?? '早盤突破',
    'BTCUSDT',
    9,
    5,
    null,
  )
}

describe('StrategyBotApplication 讀回來的樣子', () => {
  it('交給畫面的是已經算好的狀態，不是狀態字串', () => {
    // 交出原始狀態讓元件自己判斷的話，總有一天會出現
    // 「顯示已停止、卻還給按停止」這種組合。
    const application = buildApplication({
      listStrategyBots: vi.fn().mockResolvedValue([storedBot({ runState: 'running' })]),
    })

    return application.listStrategyBots('kCandle').then((bots) => {
      expect(bots[0]?.runState.isRunning).toBe(true)
      expect(bots[0]?.runState.canStop).toBe(true)
      expect(bots[0]?.runState.canStart).toBe(false)
      expect(bots[0]?.runState.canEdit).toBe(false)
    })
  })

  it('讀回來的那一台說得出它照哪一份規則跑', async () => {
    // 清單是用來回答「哪一台該管一下」的，而那個問題的一半是「它在做什麼」。
    const application = buildApplication({
      listStrategyBots: vi.fn().mockResolvedValue([storedBot()]),
    })

    const bots = await application.listStrategyBots('kCandle')

    expect(bots[0]?.tradingStrategyId).toBe(9)
    expect(bots[0]?.tradingStrategyName).toBe('黃金交叉')
  })

  it('一台都沒有是空清單，不是錯誤', async () => {
    const application = buildApplication({
      listStrategyBots: vi.fn().mockResolvedValue([]),
    })

    expect(await application.listStrategyBots('kCandle')).toEqual([])
  })
})

describe('StrategyBotApplication 存一台', () => {
  it('不帶識別碼是新增，帶了是改那一台', async () => {
    const createStrategyBot = vi.fn().mockResolvedValue(storedBot())
    const updateStrategyBot = vi.fn().mockResolvedValue(storedBot())
    const application = buildApplication({ createStrategyBot, updateStrategyBot })

    await application.saveStrategyBot(aWriteDto())
    expect(createStrategyBot).toHaveBeenCalledOnce()
    expect(updateStrategyBot).not.toHaveBeenCalled()

    await application.saveStrategyBot(aWriteDto({ id: 3 }))
    expect(updateStrategyBot).toHaveBeenCalledOnce()
  })

  it('擋得住的在送出前就擋下來，一個字都不送', async () => {
    // 讓使用者為了一個這一側早就知道的錯誤等一次往返，是拿他的時間換一行沒寫的程式。
    const createStrategyBot = vi.fn()
    const application = buildApplication({ createStrategyBot })

    await expect(application.saveStrategyBot(aWriteDto({ name: '   ' })))
      .rejects.toBeInstanceOf(StrategyBotRejectedError)
    expect(createStrategyBot).not.toHaveBeenCalled()
  })
})

describe('StrategyBotApplication 開關與刪除', () => {
  it('播放之後交回來的那一台已經是執行中的樣子', async () => {
    const application = buildApplication({
      startStrategyBot: vi.fn().mockResolvedValue(storedBot({ runState: 'running' })),
    })

    const started = await application.startStrategyBot(3)

    expect(started.runState.isRunning).toBe(true)
    expect(started.runState.statusLabel).toBe('執行中')
  })

  it('停止之後交回來的那一台已經是已停止的樣子', async () => {
    const application = buildApplication({
      stopStrategyBot: vi.fn().mockResolvedValue(storedBot()),
    })

    const stopped = await application.stopStrategyBot(3)

    expect(stopped.runState.isRunning).toBe(false)
    expect(stopped.runState.canStart).toBe(true)
  })

  it('刪除就是刪除，不先問它在不在跑', async () => {
    // 他要的結果是這台不在了，而不在了的東西不會再跑。
    const deleteStrategyBot = vi.fn().mockResolvedValue(undefined)
    const application = buildApplication({ deleteStrategyBot })

    await application.deleteStrategyBot(3)

    expect(deleteStrategyBot).toHaveBeenCalledWith(3)
  })
})

function storedBotOf(
  marketDataKind: 'kCandle' | 'contractKCandle',
  positionPlan: PositionPlanDto | null,
): StrategyBot {
  return new StrategyBot(
    3, '費率反轉', 'BTCUSDT', 5, 9, '費率反轉', 'stopped', '', null, false, positionPlan, marketDataKind)
}

function aPlan(leverage: Decimal | null) {
  return new PositionPlanDto(
    new Decimal(1000), 'allIn', new Decimal(0), new Decimal(2), new Decimal(4), leverage)
}

describe('StrategyBotApplication 分得出現貨與合約機器人', () => {
  it.each([
    {
      name: '合約機器人、5 倍有建議部位',
      bot: storedBotOf('contractKCandle', aPlan(new Decimal(5))),
      symbolLabel: 'BTCUSDT 永續合約',
      leverageLabel: '5 倍',
      editPath: '/contract-strategy-bots/3',
    },
    {
      name: '合約機器人、沒有建議部位',
      bot: storedBotOf('contractKCandle', null),
      symbolLabel: 'BTCUSDT 永續合約',
      leverageLabel: null,
      editPath: '/contract-strategy-bots/3',
    },
    {
      name: '現貨機器人、有建議部位',
      bot: storedBotOf('kCandle', aPlan(null)),
      symbolLabel: 'BTCUSDT',
      leverageLabel: null,
      editPath: '/strategy-bots/3',
    },
  ])('$name', async ({ bot, symbolLabel, leverageLabel, editPath }) => {
    const application = buildApplication({ getStrategyBot: vi.fn().mockResolvedValue(bot) })

    const botDto = await application.getStrategyBot(3)

    expect(botDto.marketDataKind).toBe(bot.marketDataKind)
    expect(botDto.symbolLabel).toBe(symbolLabel)
    expect(botDto.leverageLabel).toBe(leverageLabel)
    expect(botDto.editPath).toBe(editPath)
  })

  it.each([
    { marketDataKind: 'kCandle' as const, listPath: '/strategy-bots', listTitle: '現貨策略機器人', picksContract: false, takesLeverage: false },
    { marketDataKind: 'contractKCandle' as const, listPath: '/contract-strategy-bots', listTitle: '合約策略機器人', picksContract: true, takesLeverage: true },
  ])('$listTitle 那一頁的樣子', ({ marketDataKind, listPath, listTitle, picksContract, takesLeverage }) => {
    const page = buildApplication({}).pageFor(marketDataKind)

    expect(page.marketDataKind).toBe(marketDataKind)
    expect(page.listPath).toBe(listPath)
    expect(page.newPath).toBe(`${listPath}/new`)
    expect(page.listTitle).toBe(listTitle)
    expect(page.picksContractTradingSymbol).toBe(picksContract)
    expect(page.takesLeverage).toBe(takesLeverage)
    // 只有合約機器人的執行紀錄要提醒：交易服務在合約 K 線停了的時候跳過那一輪，紀錄上看起來是持有。
    expect(page.runHistoryNote !== null).toBe(takesLeverage)
    expect(page.runHistoryNote ?? '').toContain(takesLeverage ? '超過 5 分鐘沒有進來' : '')
  })

  it('清單只向後端要那一種', async () => {
    const listStrategyBots = vi.fn().mockResolvedValue([])
    const application = buildApplication({ listStrategyBots })

    await application.listStrategyBots('contractKCandle')

    expect(listStrategyBots).toHaveBeenCalledWith('contractKCandle')
  })

  it.each([
    { leverage: new Decimal(0.5), rejected: true },
    { leverage: new Decimal(1), rejected: false },
    { leverage: new Decimal(5), rejected: false },
  ])('合約機器人槓桿 $leverage：擋下 $rejected', async ({ leverage, rejected }) => {
    const createStrategyBot = vi.fn().mockResolvedValue(storedBotOf('contractKCandle', null))
    const application = buildApplication({ createStrategyBot })
    const writeDto = new StrategyBotWriteDto(
      undefined, '費率反轉', 'BTCUSDT', 9, 5, aPlan(leverage), 'contractKCandle')

    if (rejected) {
      await expect(application.saveStrategyBot(writeDto)).rejects.toThrow('槓桿倍數不得小於 1 倍')
      expect(createStrategyBot).not.toHaveBeenCalled()
    }
    else {
      await application.saveStrategyBot(writeDto)
      expect(createStrategyBot).toHaveBeenCalledOnce()
      expect(createStrategyBot.mock.calls[0]?.[0].sendable.marketDataKind).toBe('contractKCandle')
    }
  })
})
