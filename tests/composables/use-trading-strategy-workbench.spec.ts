// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TradingStrategyConditionDto } from '~/domain/models/dto/trading-strategy-condition-dto'
import { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import { TradingStrategySignalSourceDto } from '~/domain/models/dto/trading-strategy-signal-source-dto'
import { TradingStrategyWriteDto } from '~/domain/models/dto/trading-strategy-write-dto'

const tradingStrategyApplication = {
  getTradingStrategy: vi.fn(),
  saveTradingStrategy: vi.fn(),
}

const strategyScriptApplication = { listAvailableStrategyScripts: vi.fn() }

function tradingStrategyDto(id: number) {
  return new TradingStrategyDto(
    id, '黃金交叉',
    [new TradingStrategySignalSourceDto('A', 9, '1h', [])],
    new TradingStrategyConditionDto('n1', null, [], 'A', 'buy'),
    new TradingStrategyConditionDto('n2', null, [], 'A', 'sell'),
  )
}

function workbenchUnderTest(tradingStrategyId: number | null) {
  return useTradingStrategyWorkbench(
    tradingStrategyApplication as unknown as Parameters<typeof useTradingStrategyWorkbench>[0],
    strategyScriptApplication as unknown as Parameters<typeof useTradingStrategyWorkbench>[1],
    tradingStrategyId,
  )
}

function aWriteDto(id: number | undefined) {
  return new TradingStrategyWriteDto(id, '黃金交叉', [], null, null)
}

beforeEach(() => {
  vi.clearAllMocks()
  tradingStrategyApplication.getTradingStrategy.mockResolvedValue(tradingStrategyDto(7))
  tradingStrategyApplication.saveTradingStrategy.mockResolvedValue(tradingStrategyDto(7))
  strategyScriptApplication.listAvailableStrategyScripts.mockResolvedValue({
    mine: [{
      id: 9,
      name: '均線',
      content: { resultType: 'signal', parameters: [{ name: '回看根數' }] },
    }],
    adopted: [{ id: 10, name: '別人的動能', resultType: 'signal', parameters: [{ name: '週期' }] }],
  })
})

describe('useTradingStrategyWorkbench 挑不到策略腳本時說得出是哪一種挑不到', () => {
  it('挑得到就什麼都不必說', async () => {
    const workbench = workbenchUnderTest(null)
    await workbench.load()

    expect(workbench.shortage.value).toBeNull()
    expect(workbench.unusableStrategyScripts.value).toEqual({})
  })

  it('一支策略腳本都沒建過——下一步是去建一支', async () => {
    strategyScriptApplication.listAvailableStrategyScripts.mockResolvedValue({
      mine: [], adopted: [],
    })

    const workbench = workbenchUnderTest(null)
    await workbench.load()

    expect(workbench.shortage.value).toBe('noStrategyScripts')
  })

  it('建了幾支、但沒有一支吐訊號——下一步是去改它們，不是再建一支', async () => {
    // 這兩種說同一句話的話，後者只會去建第五支同樣用不了的腳本。
    strategyScriptApplication.listAvailableStrategyScripts.mockResolvedValue({
      mine: [{ id: 11, name: '吐一個數字的', content: { resultType: 'float', parameters: [] } }],
      adopted: [{ id: 13, name: '採用來、吐是非的', resultType: 'bool', parameters: [] }],
    })

    const workbench = workbenchUnderTest(null)
    await workbench.load()

    expect(workbench.shortage.value).toBe('noSignalStrategyScripts')
  })

  it('挑不得的那幾支連同原因一起記著——一塊指著它們的零件要說得出自己指著誰', async () => {
    strategyScriptApplication.listAvailableStrategyScripts.mockResolvedValue({
      mine: [
        { id: 9, name: '會吐訊號的', content: { resultType: 'signal', parameters: [] } },
        { id: 11, name: '吐一個數字的', content: { resultType: 'float', parameters: [] } },
      ],
      adopted: [{ id: 13, name: '採用來、吐是非的', resultType: 'bool', parameters: [] }],
    })

    const workbench = workbenchUnderTest(null)
    await workbench.load()

    expect(workbench.unusableStrategyScripts.value[11]).toContain('吐一個數字的')
    expect(workbench.unusableStrategyScripts.value[13]).toContain('採用來、吐是非的')
    expect(workbench.unusableStrategyScripts.value[9]).toBeUndefined()
  })
})

describe('useTradingStrategyWorkbench 讀一份進來', () => {
  it('新拼一份時不去問任何一份，但照樣要挑得到策略腳本', async () => {
    const workbench = workbenchUnderTest(null)
    await workbench.load()

    expect(tradingStrategyApplication.getTradingStrategy).not.toHaveBeenCalled()
    expect(workbench.editing.value).toBeNull()
    expect(workbench.strategyScriptOptions.value).toHaveLength(2)
  })

  it('改一份時去問它現在長什麼樣', async () => {
    const workbench = workbenchUnderTest(7)
    await workbench.load()

    expect(tradingStrategyApplication.getTradingStrategy).toHaveBeenCalledWith(7)
    expect(workbench.editing.value?.name).toBe('黃金交叉')
  })

  it('自己的與採用來的旋鈕各自從它們自己的形狀讀', async () => {
    // 採用來的**沒有算式**，所以它的旋鈕直接掛在上面，而自己的掛在算式內容裡。
    const workbench = workbenchUnderTest(null)
    await workbench.load()

    expect(workbench.parameterNamesByStrategyScriptId.value[9]).toEqual(['回看根數'])
    expect(workbench.parameterNamesByStrategyScriptId.value[10]).toEqual(['週期'])
  })

  it('只挑得到會吐訊號的那幾支策略腳本', async () => {
    // 機器人一律以訊號種類執行一個信號來源，所以一支吐數字的策略腳本會在第一輪算式失敗——
    // 而算式失敗是會**停擺**的那一類。使用者會得到一台按下播放、隔天發現早就停了的機器人。
    strategyScriptApplication.listAvailableStrategyScripts.mockResolvedValue({
      mine: [
        { id: 9, name: '會吐訊號的', content: { resultType: 'signal', parameters: [] } },
        { id: 11, name: '吐一個數字的', content: { resultType: 'float', parameters: [] } },
      ],
      adopted: [{ id: 13, name: '採用來、吐是非的', resultType: 'bool', parameters: [] }],
    })

    const workbench = workbenchUnderTest(null)
    await workbench.load()

    expect(workbench.strategyScriptOptions.value).toEqual([{ value: 9, label: '會吐訊號的' }])
  })

  it('那一份已經被刪掉時說找不到——它的下一步是回清單，不是重試', async () => {
    tradingStrategyApplication.getTradingStrategy.mockRejectedValue(
      new Error('找不到識別碼為 7 的策略機器人'))

    const workbench = workbenchUnderTest(7)
    await workbench.load()

    expect(workbench.missing.value).toBe(true)
  })

  it('新拼一份時讀不到策略腳本清單不算「那一份不見了」', async () => {
    // 兩件事的下一步不一樣：一個回清單，一個再試一次。
    strategyScriptApplication.listAvailableStrategyScripts.mockRejectedValue(new Error('後端連不上'))

    const workbench = workbenchUnderTest(null)
    await workbench.load()

    expect(workbench.missing.value).toBe(false)
    expect(workbench.failureMessage.value).toBe('後端連不上')
  })
})

describe('useTradingStrategyWorkbench 存起來', () => {
  it('存好了就說一聲——而且分得出剛剛是改一份還是拼了一份新的', async () => {
    // 按下儲存之後畫面上唯一改變的就是這一句，它是使用者判斷
    // 「剛剛那下到底做了什麼」的全部依據。
    const { announcement } = useConsoleAnnouncement()

    await workbenchUnderTest(7).save(aWriteDto(7))
    expect(announcement.value).toBe('更改成功')

    await workbenchUnderTest(null).save(aWriteDto(undefined))
    expect(announcement.value).toBe('交易策略拼好了')
  })

  it('存好了就把「改過了」放掉——離開這一頁不該再被攔一次', async () => {
    const workbench = workbenchUnderTest(7)
    workbench.markDirty(true)

    await workbench.save(aWriteDto(7))

    expect(workbench.dirty.value).toBe(false)
  })

  it('每存成功一次就多記一次——那是上一次重演作廢的訊號', async () => {
    // 是次數而不是「存過了沒有」：回測那一張成績單說的是存那一刻的規則，
    // 再存一次它就過時了，而一個布林值只說得出第一次。
    const workbench = workbenchUnderTest(7)
    expect(workbench.savedGeneration.value).toBe(0)

    await workbench.save(aWriteDto(7))
    expect(workbench.savedGeneration.value).toBe(1)

    await workbench.save(aWriteDto(7))
    expect(workbench.savedGeneration.value).toBe(2)
  })

  it('拼好一份新的會說出它的識別碼——這一頁從此改的是它', async () => {
    // 留在「新拼一份」那條網址上而識別碼還是空的話，
    // 再按一次儲存就會建出第二份一模一樣的。
    const workbench = workbenchUnderTest(null)

    await workbench.save(aWriteDto(undefined))

    expect(workbench.createdId.value).toBe(7)
    expect(workbench.editing.value?.id).toBe(7)
  })

  it('改一份既有的不說識別碼——沒有誰要被接手', async () => {
    const workbench = workbenchUnderTest(7)

    await workbench.save(aWriteDto(7))

    expect(workbench.createdId.value).toBeNull()
  })

  it('被拒絕時這一頁留著，一個字都沒說成功', async () => {
    // 要使用者把整棵樹重拼一次，是拿他的時間賠一個伺服器端才知道的規則。
    const { announcement } = useConsoleAnnouncement()
    announcement.value = ''
    tradingStrategyApplication.saveTradingStrategy.mockRejectedValue(
      new Error('機器人名稱「早盤突破」已被使用'))

    const workbench = workbenchUnderTest(7)
    workbench.markDirty(true)
    await workbench.save(aWriteDto(7))

    expect(workbench.savedGeneration.value).toBe(0)
    expect(workbench.createdId.value).toBeNull()
    expect(workbench.dirty.value).toBe(true)
    expect(workbench.failureMessage.value).toBe('機器人名稱「早盤突破」已被使用')
    expect(announcement.value).toBe('')
  })
})

describe('useTradingStrategyWorkbench 只拿吃 K 線的策略腳本當信號來源', () => {
  it('問清單時不指定行情種類——也就是只要 K 線那一種，交易策略在現貨上跑', async () => {
    const workbench = workbenchUnderTest(null)
    await workbench.load()

    expect(strategyScriptApplication.listAvailableStrategyScripts).toHaveBeenCalledWith()
  })
})
