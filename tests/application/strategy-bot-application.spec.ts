import { describe, expect, it, vi } from 'vitest'
import { StrategyBotApplication } from '~/application/strategy-bot-application'
import { StrategyBotService } from '~/domain/service/strategy-bot-service'
import type { IStrategyBotProxy } from '~/domain/interface/i-strategy-bot-proxy'
import { StrategyBot } from '~/domain/models/entities/strategy-bot'
import { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { StrategyBotRejectedError } from '~/domain/errors/strategy-bot-rejected-error'

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

    return application.listStrategyBots().then((bots) => {
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

    const bots = await application.listStrategyBots()

    expect(bots[0]?.tradingStrategyId).toBe(9)
    expect(bots[0]?.tradingStrategyName).toBe('黃金交叉')
  })

  it('一台都沒有是空清單，不是錯誤', async () => {
    const application = buildApplication({
      listStrategyBots: vi.fn().mockResolvedValue([]),
    })

    expect(await application.listStrategyBots()).toEqual([])
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
