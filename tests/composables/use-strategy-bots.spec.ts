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
  runRoundNow: vi.fn(),
  listRunRecords: vi.fn(),
}

const strategyScriptApplication = { listAvailableStrategyScripts: vi.fn() }

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
    strategyBotApplication as unknown as Parameters<typeof useStrategyBots>[0])
}

beforeEach(() => {
  vi.clearAllMocks()
  strategyBotApplication.listStrategyBots.mockResolvedValue([botDto(3, '早盤突破')])
  strategyScriptApplication.listAvailableStrategyScripts.mockResolvedValue({
    mine: [{
      id: 9,
      name: '均線',
      content: { resultType: 'signal', parameters: [{ name: '回看根數' }] },
    }],
    adopted: [{ id: 10, name: '別人的動能', resultType: 'signal', parameters: [{ name: '週期' }] }],
  })
})

describe('useStrategyBots 載入', () => {
  it('清單就是清單——不再去撈可挑的策略腳本', async () => {
    // 挑策略腳本、宣告來源、拼條件都搬到工作台那一頁了。這裡再撈一次，
    // 是為一個已經不在的畫面付錢。
    const bots = botsUnderTest()
    await bots.load()

    expect(bots.strategyBots.value).toHaveLength(1)
    expect(strategyScriptApplication.listAvailableStrategyScripts).not.toHaveBeenCalled()
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

describe('useStrategyBots 的執行紀錄', () => {
  it('展開時才去撈，收起來再按一次', async () => {
    // 一份清單裡十台各自先撈一次，等於為了一個多數時候沒人展開的區塊打十次後端。
    strategyBotApplication.listRunRecords.mockResolvedValue([])

    const bots = botsUnderTest()
    expect(strategyBotApplication.listRunRecords).not.toHaveBeenCalled()

    await bots.toggleRunHistory(3)
    expect(bots.expandedBotId.value).toBe(3)
    expect(strategyBotApplication.listRunRecords).toHaveBeenCalledWith(3)

    await bots.toggleRunHistory(3)
    expect(bots.expandedBotId.value).toBeNull()
  })

  it('一次只展開一台', async () => {
    strategyBotApplication.listRunRecords.mockResolvedValue([])

    const bots = botsUnderTest()
    await bots.toggleRunHistory(3)
    await bots.toggleRunHistory(4)

    expect(bots.expandedBotId.value).toBe(4)
  })

  it('讀不到時說出原因', async () => {
    strategyBotApplication.listRunRecords.mockRejectedValue(new Error('後端連不上'))

    const bots = botsUnderTest()
    await bots.toggleRunHistory(3)

    expect(bots.runRecordsFailureMessage.value).toBe('後端連不上')
    expect(bots.runRecords.value).toEqual([])
  })

  it('回來得太慢的那一份不會掛到別台底下', async () => {
    // 使用者在等待期間收起來、或改展開了別台。那一份屬於另一台機器人的歷史
    // 掛上去的話，他讀到的是一份張冠李戴的紀錄——而畫面上看不出來。
    let releaseFirst: (records: unknown[]) => void = () => {}
    strategyBotApplication.listRunRecords
      .mockImplementationOnce(() => new Promise((resolve) => { releaseFirst = resolve }))
      .mockResolvedValueOnce([])

    const bots = botsUnderTest()
    const firstToggle = bots.toggleRunHistory(3)
    await bots.toggleRunHistory(4)

    releaseFirst([{ runNumber: 1, ranAt: new Date(), resultLabel: '買入', resultTone: 'success' }])
    await firstToggle

    expect(bots.expandedBotId.value).toBe(4)
    expect(bots.runRecords.value).toEqual([])
  })
})

describe('useStrategyBots 的立即運算', () => {
  it('跑一輪之後把那一台的歷史展開', async () => {
    // 按下去卻什麼都沒變，使用者無從知道它到底跑了沒有——
    // 而剛跑完的那一輪就在歷史的第一列。
    strategyBotApplication.runRoundNow.mockResolvedValue(botDto(3, '早盤突破'))
    strategyBotApplication.listRunRecords.mockResolvedValue([])

    const bots = botsUnderTest()
    await bots.runNow(3)

    expect(strategyBotApplication.runRoundNow).toHaveBeenCalledWith(3)
    expect(bots.expandedBotId.value).toBe(3)
  })

  it('已經展開的重讀一次，不是收起來', async () => {
    strategyBotApplication.runRoundNow.mockResolvedValue(botDto(3, '早盤突破'))
    strategyBotApplication.listRunRecords.mockResolvedValue([])

    const bots = botsUnderTest()
    await bots.toggleRunHistory(3)
    await bots.runNow(3)

    expect(bots.expandedBotId.value).toBe(3)
    // 第一次是展開，第二次是跑完之後重讀。
    expect(strategyBotApplication.listRunRecords).toHaveBeenCalledTimes(2)
  })

  it('跑不動時說出原因，而且不展開一份沒有變的歷史', async () => {
    strategyBotApplication.runRoundNow.mockRejectedValue(
      new Error('這台機器人正在跑一輪，等它跑完再試一次'))

    const bots = botsUnderTest()
    await bots.runNow(3)

    expect(bots.failureMessage.value).toContain('正在跑一輪')
    expect(bots.expandedBotId.value).toBeNull()
  })
})
