// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import { StrategyBotRunStateDto } from '~/domain/models/dto/strategy-bot-run-state-dto'
import { StrategyBotSignalSourceDto } from '~/domain/models/dto/strategy-bot-signal-source-dto'
import { TelegramNotConfiguredError } from '~/domain/errors/telegram-not-configured-error'

const strategyBotApplication = {
  listStrategyBots: vi.fn(),
  getStrategyBot: vi.fn(),
  saveStrategyBot: vi.fn(),
  deleteStrategyBot: vi.fn(),
  startStrategyBot: vi.fn(),
  stopStrategyBot: vi.fn(),
}

const strategyApplication = { listAvailableStrategies: vi.fn() }

function runStateOf(isRunning: boolean) {
  return new StrategyBotRunStateDto(
    isRunning, false, false,
    isRunning ? '執行中' : '已停止',
    isRunning ? 'success' : 'neutral',
    '', '還沒送出過', !isRunning, isRunning, !isRunning, '')
}

function botDto(id: number, name: string, isRunning = false) {
  return new StrategyBotDto(
    id, name, 'BTCUSDT', 5,
    [new StrategyBotSignalSourceDto('A', 9, '1h', [])],
    new StrategyBotConditionDto('n1', null, [], 'A', 'buy'),
    new StrategyBotConditionDto('n2', null, [], 'A', 'sell'),
    runStateOf(isRunning),
  )
}

function botsUnderTest() {
  return useStrategyBots(
    strategyBotApplication as unknown as Parameters<typeof useStrategyBots>[0],
    strategyApplication as unknown as Parameters<typeof useStrategyBots>[1],
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  strategyBotApplication.listStrategyBots.mockResolvedValue([botDto(3, '早盤突破')])
  strategyApplication.listAvailableStrategies.mockResolvedValue({
    mine: [{ id: 9, name: '均線', content: { parameters: [{ name: '回看根數' }] } }],
    adopted: [{ id: 10, name: '別人的動能', parameters: [{ name: '週期' }] }],
  })
})

describe('useStrategyBots 載入', () => {
  it('機器人與可挑的策略是同一次載入的兩半', async () => {
    // 挑策略的選單沒有內容的話，這張表單第二段就填不完。
    const bots = botsUnderTest()
    await bots.load()

    expect(bots.strategyBots.value).toHaveLength(1)
    expect(bots.strategyOptions.value).toEqual([
      { value: 9, label: '均線' },
      { value: 10, label: '別人的動能' },
    ])
  })

  it('自己的與採用來的旋鈕各自從它們自己的形狀讀', async () => {
    // 採用來的**沒有算式**，所以它的旋鈕直接掛在上面，而自己的掛在算式內容裡。
    const bots = botsUnderTest()
    await bots.load()

    expect(bots.parameterNamesByStrategyId.value[9]).toEqual(['回看根數'])
    expect(bots.parameterNamesByStrategyId.value[10]).toEqual(['週期'])
  })

  it('讀不到時說得出原因，而且清單不變成半殘的樣子', async () => {
    strategyBotApplication.listStrategyBots.mockRejectedValue(new Error('後端連不上'))

    const bots = botsUnderTest()
    await bots.load()

    expect(bots.failureMessage.value).toBe('後端連不上')
    expect(bots.strategyBots.value).toEqual([])
    expect(bots.loading.value).toBe(false)
  })
})

describe('useStrategyBots 的三顆按鈕', () => {
  it('播放之後重讀清單，而不是就地改那一列', async () => {
    // 一次操作可能不只改到那一台；就地改的那一列會先變樣子。
    strategyBotApplication.startStrategyBot.mockResolvedValue(botDto(3, '早盤突破', true))
    strategyBotApplication.listStrategyBots
      .mockResolvedValueOnce([botDto(3, '早盤突破')])
      .mockResolvedValueOnce([botDto(3, '早盤突破', true)])

    const bots = botsUnderTest()
    await bots.load()
    await bots.start(3)

    expect(strategyBotApplication.startStrategyBot).toHaveBeenCalledWith(3)
    expect(bots.strategyBots.value[0]?.runState.isRunning).toBe(true)
    expect(bots.busyId.value).toBeNull()
  })

  it('沒設定 Telegram 時，那一句自己一個旗標——它要離開這個畫面才解得掉', async () => {
    strategyBotApplication.startStrategyBot.mockRejectedValue(
      new TelegramNotConfiguredError('要先完成 Telegram 設定'))

    const bots = botsUnderTest()
    await bots.start(3)

    expect(bots.deliveryNotConfigured.value).toBe(true)
    expect(bots.failureMessage.value).toBe('')
  })

  it('其餘的失敗照原樣說出來', async () => {
    strategyBotApplication.startStrategyBot.mockRejectedValue(
      new Error('同時執行中的機器人上限是 10 台'))

    const bots = botsUnderTest()
    await bots.start(3)

    expect(bots.failureMessage.value).toBe('同時執行中的機器人上限是 10 台')
    expect(bots.deliveryNotConfigured.value).toBe(false)
  })

  it('停止也會重讀清單', async () => {
    strategyBotApplication.stopStrategyBot.mockResolvedValue(botDto(3, '早盤突破'))

    const bots = botsUnderTest()
    await bots.stop(3)

    expect(strategyBotApplication.stopStrategyBot).toHaveBeenCalledWith(3)
  })
})

describe('useStrategyBots 刪除要先確認', () => {
  it('按下刪除只是先問，那一台還在', async () => {
    const bots = botsUnderTest()
    await bots.load()

    bots.askToDelete(botDto(3, '早盤突破'))

    expect(bots.deleting.value?.id).toBe(3)
    expect(strategyBotApplication.deleteStrategyBot).not.toHaveBeenCalled()
  })

  it('取消就什麼都沒發生', async () => {
    const bots = botsUnderTest()
    bots.askToDelete(botDto(3, '早盤突破'))
    bots.cancelDelete()

    expect(bots.deleting.value).toBeNull()
    expect(strategyBotApplication.deleteStrategyBot).not.toHaveBeenCalled()
  })

  it('確認之後才真的刪，並重讀清單', async () => {
    strategyBotApplication.deleteStrategyBot.mockResolvedValue(undefined)

    const bots = botsUnderTest()
    bots.askToDelete(botDto(3, '早盤突破'))
    await bots.confirmDelete()

    expect(strategyBotApplication.deleteStrategyBot).toHaveBeenCalledWith(3)
    expect(bots.deleting.value).toBeNull()
  })
})

describe('useStrategyBots 的表單', () => {
  it('存成功就關起來並重讀清單', async () => {
    strategyBotApplication.saveStrategyBot.mockResolvedValue(botDto(3, '早盤突破'))

    const bots = botsUnderTest()
    bots.openCreateForm()
    await bots.save(botDto(3, '早盤突破') as never)

    expect(bots.formOpen.value).toBe(false)
    expect(strategyBotApplication.listStrategyBots).toHaveBeenCalled()
  })

  it('被拒絕時表單留著，內容一個字都沒少', async () => {
    // 要使用者重打一次，是拿他的時間賠一個伺服器端才知道的規則。
    strategyBotApplication.saveStrategyBot.mockRejectedValue(
      new Error('機器人名稱「早盤突破」已被使用'))

    const bots = botsUnderTest()
    bots.openCreateForm()
    await bots.save(botDto(3, '早盤突破') as never)

    expect(bots.formOpen.value).toBe(true)
    expect(bots.formFailureMessage.value).toBe('機器人名稱「早盤突破」已被使用')
  })

  it('打開編輯時帶著那一台，打開新增時不帶', async () => {
    const bots = botsUnderTest()

    bots.openEditForm(botDto(3, '早盤突破'))
    expect(bots.editing.value?.id).toBe(3)

    bots.openCreateForm()
    expect(bots.editing.value).toBeNull()
  })
})
