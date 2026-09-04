import { describe, expect, it, vi } from 'vitest'
import { StrategyApplication } from '~/application/strategy-application'
import { StrategyService } from '~/domain/service/strategy-service'
import type { IStrategyProxy } from '~/domain/interface/i-strategy-proxy'
import { Strategy } from '~/domain/models/entities/strategy'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'
import { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'
import { StrategyWriteDto } from '~/domain/models/dto/strategy-write-dto'
import { StrategyFieldError } from '~/domain/errors/strategy-field-error'
import { StrategyNameConflictError } from '~/domain/errors/strategy-name-conflict-error'
import { StrategyNotFoundError } from '~/domain/errors/strategy-not-found-error'

// 只 mock 最外層的 proxy 介面；application、domain service 與所有 domain model 都是真的。
function buildApplication(strategyProxy: Partial<IStrategyProxy>): StrategyApplication {
  return new StrategyApplication(new StrategyService({
    listStrategies: vi.fn(),
    createStrategy: vi.fn(),
    updateStrategy: vi.fn(),
    deleteStrategy: vi.fn(),
    ...strategyProxy,
  }))
}

function wholeScriptOf(scriptBody: string): string {
  return new IndicatorScriptDomain(new IndicatorResultTypeDomain('floatList')).assemble(scriptBody)
}

function storedStrategy(id: number, name: string, scriptBody = 'sum := 0.0'): Strategy {
  return new Strategy(id, name, wholeScriptOf(scriptBody), 'floatList')
}

function contentOf(scriptBody = 'sum := 0.0'): StrategyContentDto {
  return new StrategyContentDto(scriptBody, 'floatList')
}

describe('StrategyApplication.listStrategies', () => {
  it('把每一支收成畫面看得懂的形狀，順序原樣沿用後端給的', async () => {
    const strategyApplication = buildApplication({
      listStrategies: vi.fn().mockResolvedValue([
        storedStrategy(1, '二十根均線'), storedStrategy(2, '六十根均線'),
      ]),
    })

    const strategies = await strategyApplication.listStrategies()

    expect(strategies.map(strategy => strategy.name)).toEqual(['二十根均線', '六十根均線'])
    expect(strategies[0]?.content.scriptBody).toBe('sum := 0.0')
    expect(strategies[0]?.content.resultType).toBe('floatList')
    expect(strategies[0]?.frameRecognised).toBe(true)
  })

  it('讀回來的策略身上沒有取數計畫可讀', async () => {
    // 型別系統已經擋住「再把它們加回去」，但那是建置時的保證。
    // 這一條在執行期也釘住它，並且說出理由：彙總刻度與要看多長屬於某一次執行，
    // 一旦它們又出現在策略身上，載入就會開始覆蓋使用者正在用的粗細。
    //
    // **旋鈕在清單裡，而它不是取數計畫。** 判準沒有變：「快線是二十期」換到哪一檔、
    // 哪種粗細去算都一樣，它是這支算法的一部分；而「多粗、多長」每一次都可能不同。
    const strategyApplication = buildApplication({
      listStrategies: vi.fn().mockResolvedValue([storedStrategy(1, '二十根均線')]),
    })

    const strategies = await strategyApplication.listStrategies()

    expect(Object.keys(strategies[0]?.content ?? {}))
      .toEqual(['scriptBody', 'resultType', 'parameters'])
  })

  it('一支都沒有是空清單，不是錯誤', async () => {
    const strategyApplication = buildApplication({
      listStrategies: vi.fn().mockResolvedValue([]),
    })

    await expect(strategyApplication.listStrategies()).resolves.toEqual([])
  })
})

describe('StrategyApplication.saveStrategy', () => {
  it('沒有識別碼時建立一支新的，不去改寫任何既有的', async () => {
    const createStrategy = vi.fn().mockResolvedValue(storedStrategy(7, '二十根均線'))
    const updateStrategy = vi.fn()
    const strategyApplication = buildApplication({ createStrategy, updateStrategy })

    const saved = await strategyApplication.saveStrategy(
      new StrategyWriteDto('二十根均線', contentOf()))

    expect(createStrategy).toHaveBeenCalledOnce()
    expect(updateStrategy).not.toHaveBeenCalled()
    expect(saved.id).toBe(7)
  })

  it('帶識別碼時改寫那一支，不去建立新的', async () => {
    const createStrategy = vi.fn()
    const updateStrategy = vi.fn().mockResolvedValue(storedStrategy(7, '二十根均線'))
    const strategyApplication = buildApplication({ createStrategy, updateStrategy })

    await strategyApplication.saveStrategy(new StrategyWriteDto('二十根均線', contentOf(), 7))

    expect(updateStrategy).toHaveBeenCalledOnce()
    expect(createStrategy).not.toHaveBeenCalled()
  })

  it('送出去的是把內容包回外框之後的一整段算式', async () => {
    const createStrategy = vi.fn().mockResolvedValue(storedStrategy(7, '二十根均線'))
    const strategyApplication = buildApplication({ createStrategy })

    await strategyApplication.saveStrategy(new StrategyWriteDto('二十根均線', contentOf()))

    expect(createStrategy.mock.calls[0]?.[0].script).toContain('package main')
    expect(createStrategy.mock.calls[0]?.[0].script).toContain('\tsum := 0.0')
  })

  it.each([
    { name: '完全沒填', declaredName: '' },
    { name: '只有空白字元', declaredName: '   ' },
  ])('名稱$name時一個字都不送出去', async ({ declaredName }) => {
    const createStrategy = vi.fn()
    const updateStrategy = vi.fn()
    const strategyApplication = buildApplication({ createStrategy, updateStrategy })

    await expect(strategyApplication.saveStrategy(
      new StrategyWriteDto(declaredName, contentOf()))).rejects.toBeInstanceOf(StrategyFieldError)
    expect(createStrategy).not.toHaveBeenCalled()
    expect(updateStrategy).not.toHaveBeenCalled()
  })

  it('名稱被別的策略用掉時如實轉達', async () => {
    const strategyApplication = buildApplication({
      createStrategy: vi.fn().mockRejectedValue(new StrategyNameConflictError('已被使用')),
    })

    await expect(strategyApplication.saveStrategy(new StrategyWriteDto('二十根均線', contentOf())))
      .rejects.toBeInstanceOf(StrategyNameConflictError)
  })

  it('要改寫的那一支已經不在時如實轉達', async () => {
    const strategyApplication = buildApplication({
      updateStrategy: vi.fn().mockRejectedValue(new StrategyNotFoundError('找不到')),
    })

    await expect(strategyApplication.saveStrategy(new StrategyWriteDto('二十根均線', contentOf(), 7)))
      .rejects.toBeInstanceOf(StrategyNotFoundError)
  })
})

describe('StrategyApplication.deleteStrategy', () => {
  it('刪掉指名的那一支', async () => {
    const deleteStrategy = vi.fn().mockResolvedValue(undefined)
    const strategyApplication = buildApplication({ deleteStrategy })

    await strategyApplication.deleteStrategy(7)

    expect(deleteStrategy).toHaveBeenCalledWith(7)
  })

  it('那一支已經不在時如實轉達', async () => {
    const strategyApplication = buildApplication({
      deleteStrategy: vi.fn().mockRejectedValue(new StrategyNotFoundError('找不到')),
    })

    await expect(strategyApplication.deleteStrategy(7))
      .rejects.toBeInstanceOf(StrategyNotFoundError)
  })
})

describe('StrategyApplication.hasUnsavedChanges', () => {
  it('載入之後一個字都沒改就不必問', () => {
    const strategyApplication = buildApplication({})

    expect(strategyApplication.hasUnsavedChanges(contentOf(), contentOf())).toBe(false)
  })

  it('改過了就要問', () => {
    const strategyApplication = buildApplication({})

    expect(strategyApplication.hasUnsavedChanges(contentOf(), contentOf('sum := 1.0'))).toBe(true)
  })

  it('還沒載入過任何策略但已經寫了東西時要問', () => {
    const strategyApplication = buildApplication({})

    expect(strategyApplication.hasUnsavedChanges(null, contentOf('sum := 0.0'))).toBe(true)
  })

  it('還沒載入過任何策略且什麼都沒寫時不必問', () => {
    const strategyApplication = buildApplication({})

    expect(strategyApplication.hasUnsavedChanges(null, contentOf(''))).toBe(false)
  })
})
