// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import { StrategyBotRunStateDto } from '~/domain/models/dto/strategy-bot-run-state-dto'
import { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'

const strategyBotApplication = {
  getStrategyBot: vi.fn(),
  saveStrategyBot: vi.fn(),
}

const tradingStrategyApplication = { listTradingStrategies: vi.fn() }

function botDto(id: number) {
  return new StrategyBotDto(
    id, '早盤突破', 'BTCUSDT', 5, 9, '黃金交叉',
    new StrategyBotRunStateDto(
      false, false, false, '已停止', 'neutral', '', '還沒送出過', true, false, true, ''),
    null,
  )
}

function workbenchUnderTest(strategyBotId: number | null) {
  return useStrategyBotWorkbench(
    strategyBotApplication as unknown as Parameters<typeof useStrategyBotWorkbench>[0],
    tradingStrategyApplication as unknown as Parameters<typeof useStrategyBotWorkbench>[1],
    strategyBotId,
  )
}

function aWriteDto(id: number | undefined) {
  return new StrategyBotWriteDto(id, '早盤突破', 'BTCUSDT', 9, 5, null)
}

beforeEach(() => {
  vi.clearAllMocks()
  strategyBotApplication.getStrategyBot.mockResolvedValue(botDto(7))
  strategyBotApplication.saveStrategyBot.mockResolvedValue(botDto(7))
  tradingStrategyApplication.listTradingStrategies.mockResolvedValue([
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

    expect(tradingStrategyApplication.listTradingStrategies).toHaveBeenCalledTimes(1)
    expect(workbench.tradingStrategyOptions.value[0]).toEqual({ value: 9, label: '黃金交叉' })
  })

  it('一份交易策略都還沒有時是一份空的選項，不是一個錯誤', async () => {
    tradingStrategyApplication.listTradingStrategies.mockResolvedValue([])

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
    tradingStrategyApplication.listTradingStrategies.mockRejectedValue(new Error('連不上'))

    const workbench = workbenchUnderTest(null)
    await workbench.load()

    expect(workbench.missing.value).toBe(false)
    expect(workbench.failureMessage.value).toBe('連不上')
  })
})

describe('useStrategyBotWorkbench 存回去', () => {
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

describe('useStrategyBotWorkbench 只列機器人跟得了的交易策略', () => {
  it('一份合約交易策略不出現在選項裡——機器人目前只跑 K 線', async () => {
    tradingStrategyApplication.listTradingStrategies.mockResolvedValue([
      new TradingStrategyDto(9, '黃金交叉', [], null, null),
      new TradingStrategyDto(
        11, '費率反轉', [], null, null, 'contractKCandle', '合約行情', 'longShort', '多空反手', true, false),
    ])

    const workbench = workbenchUnderTest(null)
    await workbench.load()

    expect(workbench.tradingStrategyOptions.value).toEqual([{ value: 9, label: '黃金交叉' }])
  })
})
