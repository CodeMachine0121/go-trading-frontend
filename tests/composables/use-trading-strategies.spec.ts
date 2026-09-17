// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import { TradingStrategySignalSourceDto } from '~/domain/models/dto/trading-strategy-signal-source-dto'
import { TradingStrategyInUseError } from '~/domain/errors/trading-strategy-in-use-error'

const tradingStrategyApplication = {
  listTradingStrategies: vi.fn(),
  getTradingStrategy: vi.fn(),
  saveTradingStrategy: vi.fn(),
  deleteTradingStrategy: vi.fn(),
}

function tradingStrategyDto(id: number, name: string) {
  return new TradingStrategyDto(
    id, name, 'longShort',
    [new TradingStrategySignalSourceDto('A', 9, '1h', [])], null, null)
}

function underTest() {
  return useTradingStrategies(
    tradingStrategyApplication as unknown as Parameters<typeof useTradingStrategies>[0])
}

beforeEach(() => {
  vi.clearAllMocks()
  tradingStrategyApplication.listTradingStrategies.mockResolvedValue([
    tradingStrategyDto(1, '黃金交叉'),
    tradingStrategyDto(2, '死亡交叉'),
  ])
  tradingStrategyApplication.deleteTradingStrategy.mockResolvedValue(undefined)
})

describe('useTradingStrategies 讀清單', () => {
  it('讀回自己的每一份', async () => {
    const tradingStrategies = underTest()
    await tradingStrategies.load()

    expect(tradingStrategies.tradingStrategies.value).toHaveLength(2)
    expect(tradingStrategies.failureMessage.value).toBe('')
  })

  it('一份都沒有是空清單，不是錯誤', async () => {
    tradingStrategyApplication.listTradingStrategies.mockResolvedValue([])

    const tradingStrategies = underTest()
    await tradingStrategies.load()

    expect(tradingStrategies.tradingStrategies.value).toEqual([])
    expect(tradingStrategies.failureMessage.value).toBe('')
  })

  it('讀不到時說得出原因，而不是交出一份空清單', async () => {
    // 交出空清單的話，一次連不上會被讀成「我什麼都沒有」。
    tradingStrategyApplication.listTradingStrategies.mockRejectedValue(new Error('連不上'))

    const tradingStrategies = underTest()
    await tradingStrategies.load()

    expect(tradingStrategies.failureMessage.value).toBe('連不上')
  })
})

describe('useTradingStrategies 刪一份', () => {
  it('按下刪除只是問一聲', async () => {
    const tradingStrategies = underTest()
    await tradingStrategies.load()

    tradingStrategies.askToDelete(tradingStrategyDto(1, '黃金交叉'))

    expect(tradingStrategies.deleting.value?.name).toBe('黃金交叉')
    expect(tradingStrategyApplication.deleteTradingStrategy).not.toHaveBeenCalled()
  })

  it('按取消就什麼都沒發生', async () => {
    const tradingStrategies = underTest()
    await tradingStrategies.load()

    tradingStrategies.askToDelete(tradingStrategyDto(1, '黃金交叉'))
    tradingStrategies.cancelDelete()

    expect(tradingStrategies.deleting.value).toBeNull()
    expect(tradingStrategyApplication.deleteTradingStrategy).not.toHaveBeenCalled()
  })

  it('確認之後才真的刪，而且刪完重讀一次', async () => {
    const tradingStrategies = underTest()
    await tradingStrategies.load()

    tradingStrategies.askToDelete(tradingStrategyDto(1, '黃金交叉'))
    await tradingStrategies.confirmDelete()

    expect(tradingStrategyApplication.deleteTradingStrategy).toHaveBeenCalledWith(1)
    expect(tradingStrategyApplication.listTradingStrategies).toHaveBeenCalledTimes(2)
    expect(tradingStrategies.deleting.value).toBeNull()
  })

  it('還有機器人在用它時照後端說的講，而且那一份還在', async () => {
    // 那句話說得出有幾台，而那正是使用者接下來要處理的東西。
    tradingStrategyApplication.deleteTradingStrategy.mockRejectedValue(
      new TradingStrategyInUseError('還有 2 台機器人正在用它，請先改掉或刪掉那幾台'))

    const tradingStrategies = underTest()
    await tradingStrategies.load()
    tradingStrategies.askToDelete(tradingStrategyDto(1, '黃金交叉'))
    await tradingStrategies.confirmDelete()

    expect(tradingStrategies.failureMessage.value).toContain('2 台')
    expect(tradingStrategies.tradingStrategies.value).toHaveLength(2)
    // 對話框關掉：那句拒絕要做的事不在這個框裡做得完。
    expect(tradingStrategies.deleting.value).toBeNull()
  })
})
