// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import { StrategyBotRunStateDto } from '~/domain/models/dto/strategy-bot-run-state-dto'
import { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import { MarketDataKindDomain } from '~/domain/models/domains/market-data-kind-domain'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'

const strategyBotApplication = {
  getStrategyBot: vi.fn(),
  saveStrategyBot: vi.fn(),
  pageFor: vi.fn((marketDataKind: MarketDataKind) =>
    new MarketDataKindDomain(marketDataKind).toStrategyBotPageDto()),
}

const tradingStrategyApplication = { listTradingStrategiesFollowableBy: vi.fn() }

function botDto(id: number, marketDataKind: MarketDataKind = 'kCandle') {
  return new StrategyBotDto(
    id, '早盤突破', 'BTCUSDT', 5, 9, '黃金交叉',
    new StrategyBotRunStateDto(
      false, false, false, '已停止', 'neutral', '', '還沒送出過', true, false, true, ''),
    null,
    marketDataKind,
    'BTCUSDT',
    null,
    marketDataKind === 'kCandle' ? `/strategy-bots/${id}` : `/contract-strategy-bots/${id}`,
  )
}

function workbenchUnderTest(strategyBotId: number | null, marketDataKind: MarketDataKind = 'kCandle') {
  return useStrategyBotWorkbench(
    strategyBotApplication as unknown as Parameters<typeof useStrategyBotWorkbench>[0],
    tradingStrategyApplication as unknown as Parameters<typeof useStrategyBotWorkbench>[1],
    strategyBotId,
    marketDataKind,
  )
}

function aWriteDto(id: number | undefined) {
  return new StrategyBotWriteDto(id, '早盤突破', 'BTCUSDT', 9, 5, null)
}

beforeEach(() => {
  vi.clearAllMocks()
  strategyBotApplication.getStrategyBot.mockResolvedValue(botDto(7))
  strategyBotApplication.saveStrategyBot.mockResolvedValue(botDto(7))
  tradingStrategyApplication.listTradingStrategiesFollowableBy.mockResolvedValue([
    new TradingStrategyDto(9, '黃金交叉', [], null, null),
    new TradingStrategyDto(10, '死亡交叉', [], null, null),
  ])
})

describe('useStrategyBotWorkbench 讀一台進來', () => {
  it('新拼一台時不去問任何一台，但照樣要挑得到交易策略', async () => {
    const workbench = workbenchUnderTest(null)
    await workbench.load()

    expect(strategyBotApplication.getStrategyBot).not.toHaveBeenCalled()
    expect(workbench.editing.value).toBeNull()
    expect(workbench.tradingStrategyOptions.value).toHaveLength(2)
  })

  it('改一台時去問它現在長什麼樣', async () => {
    const workbench = workbenchUnderTest(7)
    await workbench.load()

    expect(strategyBotApplication.getStrategyBot).toHaveBeenCalledWith(7)
    expect(workbench.editing.value?.name).toBe('早盤突破')
    expect(workbench.editing.value?.tradingStrategyId).toBe(9)
  })

  it('交易策略清單只讀一次，不為了顯示一個名字而每一列各問一次', async () => {
    const workbench = workbenchUnderTest(7)
    await workbench.load()

    expect(tradingStrategyApplication.listTradingStrategiesFollowableBy).toHaveBeenCalledTimes(1)
    expect(workbench.tradingStrategyOptions.value[0]).toEqual({ value: 9, label: '黃金交叉' })
  })

  it('一份交易策略都還沒有時是一份空的選項，不是一個錯誤', async () => {
    tradingStrategyApplication.listTradingStrategiesFollowableBy.mockResolvedValue([])

    const workbench = workbenchUnderTest(null)
    await workbench.load()

    expect(workbench.tradingStrategyOptions.value).toHaveLength(0)
    expect(workbench.failureMessage.value).toBe('')
  })

  it('那一台已經被刪掉時說找不到——它的下一步是回清單，不是重試', async () => {
    strategyBotApplication.getStrategyBot.mockRejectedValue(new Error('找不到'))

    const workbench = workbenchUnderTest(7)
    await workbench.load()

    expect(workbench.missing.value).toBe(true)
  })

  it('新拼一台時讀不到交易策略清單不算「那一台不見了」', async () => {
    // 找不到那一台的下一步是回清單，讀不到清單的下一步是再試一次。
    // 分不出來的話，使用者會被送回一張他根本沒有要離開的清單。
    tradingStrategyApplication.listTradingStrategiesFollowableBy.mockRejectedValue(new Error('連不上'))

    const workbench = workbenchUnderTest(null)
    await workbench.load()

    expect(workbench.missing.value).toBe(false)
    expect(workbench.failureMessage.value).toBe('連不上')
  })

  it('連不上後端時明說連不上', async () => {
    tradingStrategyApplication.listTradingStrategiesFollowableBy.mockRejectedValue(new BackendUnreachableError('/trading-strategies'))

    const workbench = workbenchUnderTest(null)
    await workbench.load()

    expect(workbench.failureMessage.value).toBe('連不上後端 go-trading API，請確認它已啟動，且本站來源在它的 CORS_ALLOWED_ORIGINS 名單內。')
  })
})

describe('useStrategyBotWorkbench 存回去', () => {
  it('存好了就說一聲——分得出是拼了一台新的還是改了一台', async () => {
    const { announcement } = useConsoleAnnouncement()

    await workbenchUnderTest(null, 'contractKCandle').save(aWriteDto(undefined))
    expect(announcement.value).toBe('機器人建好了')

    await workbenchUnderTest(7, 'contractKCandle').save(aWriteDto(7))
    expect(announcement.value).toBe('更改成功')
  })

  it('存好了就說一聲——而且分得出剛剛是改一台還是拼了一台新的', async () => {
    const workbench = workbenchUnderTest(null)
    await workbench.load()
    await workbench.save(aWriteDto(undefined))

    expect(workbench.saved.value).toBe(true)
  })

  it('存好了就把「改過了」放掉——離開這一頁不該再被攔一次', async () => {
    const workbench = workbenchUnderTest(7)
    await workbench.load()
    workbench.markDirty(true)

    await workbench.save(aWriteDto(7))

    expect(workbench.dirty.value).toBe(false)
  })

  it('被拒絕時這一頁留著，一個字都沒說成功', async () => {
    strategyBotApplication.saveStrategyBot.mockRejectedValue(new Error('名稱已經有人用了'))

    const workbench = workbenchUnderTest(7)
    await workbench.load()
    await workbench.save(aWriteDto(7))

    expect(workbench.saved.value).toBe(false)
    expect(workbench.failureMessage.value).toBe('名稱已經有人用了')
  })
})

describe('useStrategyBotWorkbench 只拼這一種機器人', () => {
  it.each([
    { marketDataKind: 'kCandle' as const },
    { marketDataKind: 'contractKCandle' as const },
  ])('$marketDataKind 那一頁只向交易策略要這一種機器人跟得了的', async ({ marketDataKind }) => {
    const workbench = workbenchUnderTest(null, marketDataKind)
    await workbench.load()

    expect(tradingStrategyApplication.listTradingStrategiesFollowableBy).toHaveBeenCalledWith(marketDataKind)
  })

  it('從現貨那一頁打開一台合約機器人，被送到它自己的編輯頁、不在這一頁改它', async () => {
    strategyBotApplication.getStrategyBot.mockResolvedValue(botDto(7, 'contractKCandle'))

    const workbench = workbenchUnderTest(7, 'kCandle')
    await workbench.load()

    expect(workbench.redirectPath.value).toBe('/contract-strategy-bots/7')
    expect(workbench.editing.value).toBeNull()
  })

  it('打開的是同一種機器人時不送走', async () => {
    strategyBotApplication.getStrategyBot.mockResolvedValue(botDto(7, 'contractKCandle'))

    const workbench = workbenchUnderTest(7, 'contractKCandle')
    await workbench.load()

    expect(workbench.redirectPath.value).toBeNull()
    expect(workbench.editing.value?.id).toBe(7)
  })

  it('這一頁的樣子由那一種說：合約那一頁存好回到合約清單', () => {
    expect(workbenchUnderTest(null, 'contractKCandle').page.listPath).toBe('/contract-strategy-bots')
    expect(workbenchUnderTest(null, 'kCandle').page.listPath).toBe('/strategy-bots')
  })
})
