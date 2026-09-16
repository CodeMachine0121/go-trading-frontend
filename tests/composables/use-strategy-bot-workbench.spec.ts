// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import { StrategyBotRunStateDto } from '~/domain/models/dto/strategy-bot-run-state-dto'
import { StrategyBotSignalSourceDto } from '~/domain/models/dto/strategy-bot-signal-source-dto'
import { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'

const strategyBotApplication = {
  getStrategyBot: vi.fn(),
  saveStrategyBot: vi.fn(),
}

const strategyApplication = { listAvailableStrategies: vi.fn() }

function botDto(id: number) {
  return new StrategyBotDto(
    id, '早盤突破', 'BTCUSDT', 5,
    [new StrategyBotSignalSourceDto('A', 9, '1h', [])],
    new StrategyBotConditionDto('n1', null, [], 'A', 'buy'),
    new StrategyBotConditionDto('n2', null, [], 'A', 'sell'),
    new StrategyBotRunStateDto(
      false, false, false, '已停止', 'neutral', '', '還沒送出過', true, false, true, ''),
  )
}

function workbenchUnderTest(strategyBotId: number | null) {
  return useStrategyBotWorkbench(
    strategyBotApplication as unknown as Parameters<typeof useStrategyBotWorkbench>[0],
    strategyApplication as unknown as Parameters<typeof useStrategyBotWorkbench>[1],
    strategyBotId,
  )
}

function aWriteDto(id: number | undefined) {
  return new StrategyBotWriteDto(id, '早盤突破', 'BTCUSDT', 5, [], null, null)
}

beforeEach(() => {
  vi.clearAllMocks()
  strategyBotApplication.getStrategyBot.mockResolvedValue(botDto(7))
  strategyBotApplication.saveStrategyBot.mockResolvedValue(botDto(7))
  strategyApplication.listAvailableStrategies.mockResolvedValue({
    mine: [{
      id: 9,
      name: '均線',
      content: { resultType: 'signal', parameters: [{ name: '回看根數' }] },
    }],
    adopted: [{ id: 10, name: '別人的動能', resultType: 'signal', parameters: [{ name: '週期' }] }],
  })
})

describe('useStrategyBotWorkbench 讀一台進來', () => {
  it('新拼一台時不去問任何一台，但照樣要挑得到策略', async () => {
    const workbench = workbenchUnderTest(null)
    await workbench.load()

    expect(strategyBotApplication.getStrategyBot).not.toHaveBeenCalled()
    expect(workbench.editing.value).toBeNull()
    expect(workbench.strategyOptions.value).toHaveLength(2)
  })

  it('改一台時去問它現在長什麼樣', async () => {
    const workbench = workbenchUnderTest(7)
    await workbench.load()

    expect(strategyBotApplication.getStrategyBot).toHaveBeenCalledWith(7)
    expect(workbench.editing.value?.name).toBe('早盤突破')
  })

  it('自己的與採用來的旋鈕各自從它們自己的形狀讀', async () => {
    // 採用來的**沒有算式**，所以它的旋鈕直接掛在上面，而自己的掛在算式內容裡。
    const workbench = workbenchUnderTest(null)
    await workbench.load()

    expect(workbench.parameterNamesByStrategyId.value[9]).toEqual(['回看根數'])
    expect(workbench.parameterNamesByStrategyId.value[10]).toEqual(['週期'])
  })

  it('只挑得到會吐訊號的那幾支策略', async () => {
    // 機器人一律以訊號種類執行一個信號來源，所以一支吐數字的策略會在第一輪算式失敗——
    // 而算式失敗是會**停擺**的那一類。使用者會得到一台按下播放、隔天發現早就停了的機器人。
    strategyApplication.listAvailableStrategies.mockResolvedValue({
      mine: [
        { id: 9, name: '會吐訊號的', content: { resultType: 'signal', parameters: [] } },
        { id: 11, name: '吐一個數字的', content: { resultType: 'float', parameters: [] } },
      ],
      adopted: [{ id: 13, name: '採用來、吐是非的', resultType: 'bool', parameters: [] }],
    })

    const workbench = workbenchUnderTest(null)
    await workbench.load()

    expect(workbench.strategyOptions.value).toEqual([{ value: 9, label: '會吐訊號的' }])
  })

  it('那一台已經被刪掉時說找不到——它的下一步是回清單，不是重試', async () => {
    strategyBotApplication.getStrategyBot.mockRejectedValue(
      new Error('找不到識別碼為 7 的策略機器人'))

    const workbench = workbenchUnderTest(7)
    await workbench.load()

    expect(workbench.missing.value).toBe(true)
  })

  it('新拼一台時讀不到策略清單不算「那一台不見了」', async () => {
    // 兩件事的下一步不一樣：一個回清單，一個再試一次。
    strategyApplication.listAvailableStrategies.mockRejectedValue(new Error('後端連不上'))

    const workbench = workbenchUnderTest(null)
    await workbench.load()

    expect(workbench.missing.value).toBe(false)
    expect(workbench.failureMessage.value).toBe('後端連不上')
  })
})

describe('useStrategyBotWorkbench 存起來', () => {
  it('存好了就說一聲——而且分得出剛剛是改一台還是拼了一台新的', async () => {
    // 按下儲存之後畫面上唯一改變的就是這一句，它是使用者判斷
    // 「剛剛那下到底做了什麼」的全部依據。
    const { announcement } = useConsoleAnnouncement()

    await workbenchUnderTest(7).save(aWriteDto(7))
    expect(announcement.value).toBe('更改成功')

    await workbenchUnderTest(null).save(aWriteDto(undefined))
    expect(announcement.value).toBe('機器人建好了')
  })

  it('存好了就把「改過了」放掉——離開這一頁不該再被攔一次', async () => {
    const workbench = workbenchUnderTest(7)
    workbench.markDirty(true)

    await workbench.save(aWriteDto(7))

    expect(workbench.dirty.value).toBe(false)
    expect(workbench.saved.value).toBe(true)
  })

  it('被拒絕時這一頁留著，一個字都沒說成功', async () => {
    // 要使用者把整棵樹重拼一次，是拿他的時間賠一個伺服器端才知道的規則。
    const { announcement } = useConsoleAnnouncement()
    announcement.value = ''
    strategyBotApplication.saveStrategyBot.mockRejectedValue(
      new Error('機器人名稱「早盤突破」已被使用'))

    const workbench = workbenchUnderTest(7)
    workbench.markDirty(true)
    await workbench.save(aWriteDto(7))

    expect(workbench.saved.value).toBe(false)
    expect(workbench.dirty.value).toBe(true)
    expect(workbench.failureMessage.value).toBe('機器人名稱「早盤突破」已被使用')
    expect(announcement.value).toBe('')
  })
})
