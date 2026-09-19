import { describe, expect, it, vi } from 'vitest'
import { StrategyScriptApplication } from '~/application/strategy-script-application'
import { StrategyScriptService } from '~/domain/service/strategy-script-service'
import type { IStrategyScriptProxy } from '~/domain/interface/i-strategy-script-proxy'
import { StrategyScript } from '~/domain/models/entities/strategy-script'
import { StrategyScriptContentDto } from '~/domain/models/dto/strategy-script-content-dto'
import { StrategyScriptWriteDto } from '~/domain/models/dto/strategy-script-write-dto'
import { buildAdoptedStrategyScript } from '../fixtures/strategy-script-application'
import { StrategyScriptFieldError } from '~/domain/errors/strategy-script-field-error'
import { StrategyScriptNameConflictError } from '~/domain/errors/strategy-script-name-conflict-error'
import { StrategyScriptNotFoundError } from '~/domain/errors/strategy-script-not-found-error'

// 只 mock 最外層的 proxy 介面；application、domain service 與所有 domain model 都是真的。
function buildApplication(strategyScriptProxy: Partial<IStrategyScriptProxy>): StrategyScriptApplication {
  return new StrategyScriptApplication(new StrategyScriptService({
    listAvailableStrategyScripts: vi.fn(),
    createStrategyScript: vi.fn(),
    updateStrategyScript: vi.fn(),
    deleteStrategyScript: vi.fn(),
    publishStrategyScript: vi.fn(),
    withdrawStrategyScript: vi.fn(),
    ...strategyScriptProxy,
  }))
}

const WHOLE_SCRIPT = [
  'package main',
  '',
  'import "indicator"',
  '',
  'func Calculate(data []indicator.KCandle) map[string][]float64 {',
  '\treturn nil',
  '}',
].join('\n')

function storedStrategyScript(id: number, name: string, script = WHOLE_SCRIPT): StrategyScript {
  return new StrategyScript(id, name, '', script, 'floatList')
}

function contentOf(script = WHOLE_SCRIPT): StrategyScriptContentDto {
  return new StrategyScriptContentDto(script, 'floatList')
}

describe('StrategyScriptApplication.listStrategyScripts', () => {
  it('把每一支收成畫面看得懂的形狀，順序原樣沿用後端給的', async () => {
    const strategyScriptApplication = buildApplication({
      listAvailableStrategyScripts: vi.fn().mockResolvedValue({
        mine: [storedStrategyScript(1, '二十根均線'), storedStrategyScript(2, '六十根均線')],
        adopted: [],
      }),
    })

    const available = await strategyScriptApplication.listAvailableStrategyScripts()

    expect(available.mine.map(strategyScript => strategyScript.name)).toEqual(['二十根均線', '六十根均線'])
    expect(available.mine[0]?.content.script).toBe(WHOLE_SCRIPT)
    expect(available.mine[0]?.content.resultType).toBe('floatList')
  })

  it('存著的那一整份原樣帶進畫面，開頭與這裡預填的不一樣也一樣', async () => {
    const somebodyElsesScript = 'package main\n\nimport (\n\t"indicator"\n\t"strings"\n)\n\nfunc Calculate() {}'
    const strategyScriptApplication = buildApplication({
      listAvailableStrategyScripts: vi.fn().mockResolvedValue({
        mine: [storedStrategyScript(1, '別處寫的', somebodyElsesScript)],
        adopted: [],
      }),
    })

    const available = await strategyScriptApplication.listAvailableStrategyScripts()

    expect(available.mine[0]?.content.script).toBe(somebodyElsesScript)
  })

  it('讀回來的策略腳本身上沒有取數計畫可讀', async () => {
    // 型別系統已經擋住「再把它們加回去」，但那是建置時的保證。
    // 這一條在執行期也釘住它，並且說出理由：彙總刻度與要看多長屬於某一次執行，
    // 一旦它們又出現在策略腳本身上，載入就會開始覆蓋使用者正在用的粗細。
    //
    // **旋鈕在清單裡，而它不是取數計畫。** 判準沒有變：「快線是二十期」換到哪一檔、
    // 哪種粗細去算都一樣，它是這支算法的一部分；而「多粗、多長」每一次都可能不同。
    const strategyScriptApplication = buildApplication({
      listAvailableStrategyScripts: vi.fn().mockResolvedValue({
        mine: [storedStrategyScript(1, '二十根均線')],
        adopted: [],
      }),
    })

    const available = await strategyScriptApplication.listAvailableStrategyScripts()

    expect(Object.keys(available.mine[0]?.content ?? {}))
      .toEqual(['script', 'resultType', 'parameters'])
  })

  it('兩段都空是答案，不是錯誤', async () => {
    const strategyScriptApplication = buildApplication({
      listAvailableStrategyScripts: vi.fn().mockResolvedValue({ mine: [], adopted: [] }),
    })

    const available = await strategyScriptApplication.listAvailableStrategyScripts()

    expect(available.mine).toEqual([])
    expect(available.adopted).toEqual([])
  })

  it('加入來的那一段收成沒有算式的形狀', async () => {
    // 這是這個切片最重要的一句話：分享出去的是一支策略腳本的用處，不是它的作法。
    // 它在型別上就成立——那一段的每一筆根本沒有算式可以讀。
    const strategyScriptApplication = buildApplication({
      listAvailableStrategyScripts: vi.fn().mockResolvedValue({
        mine: [],
        adopted: [buildAdoptedStrategyScript(9, '別人的', { description: '抓短線轉折' })],
      }),
    })

    const available = await strategyScriptApplication.listAvailableStrategyScripts()

    expect(available.adopted).toHaveLength(1)
    expect(available.adopted[0]?.name).toBe('別人的')
    expect(available.adopted[0]?.description).toBe('抓短線轉折')
    expect(available.adopted[0]?.publisherEmail).toBe('someone@example.com')
    expect(available.adopted[0]).not.toHaveProperty('content')
    expect(available.adopted[0]).not.toHaveProperty('script')
  })

  it('把自己的那一支放上市集或收回來', async () => {
    const publishStrategyScript = vi.fn().mockResolvedValue(undefined)
    const withdrawStrategyScript = vi.fn().mockResolvedValue(undefined)
    const strategyScriptApplication = buildApplication({ publishStrategyScript, withdrawStrategyScript })

    await strategyScriptApplication.publishStrategyScript(7)
    await strategyScriptApplication.withdrawStrategyScript(7)

    expect(publishStrategyScript).toHaveBeenCalledWith(7)
    expect(withdrawStrategyScript).toHaveBeenCalledWith(7)
  })
})

describe('StrategyScriptApplication.saveStrategyScript', () => {
  it('沒有識別碼時建立一支新的，不去改寫任何既有的', async () => {
    const createStrategyScript = vi.fn().mockResolvedValue(storedStrategyScript(7, '二十根均線'))
    const updateStrategyScript = vi.fn()
    const strategyScriptApplication = buildApplication({ createStrategyScript, updateStrategyScript })

    const saved = await strategyScriptApplication.saveStrategyScript(
      new StrategyScriptWriteDto('二十根均線', contentOf()))

    expect(createStrategyScript).toHaveBeenCalledOnce()
    expect(updateStrategyScript).not.toHaveBeenCalled()
    expect(saved.id).toBe(7)
  })

  it('帶識別碼時改寫那一支，不去建立新的', async () => {
    const createStrategyScript = vi.fn()
    const updateStrategyScript = vi.fn().mockResolvedValue(storedStrategyScript(7, '二十根均線'))
    const strategyScriptApplication = buildApplication({ createStrategyScript, updateStrategyScript })

    await strategyScriptApplication.saveStrategyScript(new StrategyScriptWriteDto('二十根均線', contentOf(), 7))

    expect(updateStrategyScript).toHaveBeenCalledOnce()
    expect(createStrategyScript).not.toHaveBeenCalled()
  })

  it('送出去的就是畫面上那一整份算式，一字不改', async () => {
    const createStrategyScript = vi.fn().mockResolvedValue(storedStrategyScript(7, '二十根均線'))
    const strategyScriptApplication = buildApplication({ createStrategyScript })

    await strategyScriptApplication.saveStrategyScript(new StrategyScriptWriteDto('二十根均線', contentOf()))

    expect(createStrategyScript.mock.calls[0]?.[0].script).toBe(WHOLE_SCRIPT)
  })

  it('載入之後原封不動再存一次，送出去的與載入時逐字相同', async () => {
    const stored = storedStrategyScript(7, '二十根均線')
    const createStrategyScript = vi.fn().mockResolvedValue(stored)
    const strategyScriptApplication = buildApplication({
      listAvailableStrategyScripts: vi.fn().mockResolvedValue({ mine: [stored], adopted: [] }),
      createStrategyScript,
    })

    const available = await strategyScriptApplication.listAvailableStrategyScripts()
    await strategyScriptApplication.saveStrategyScript(
      new StrategyScriptWriteDto('二十根均線', available.mine[0]!.content))

    expect(createStrategyScript.mock.calls[0]?.[0].script).toBe(stored.script)
  })

  it('算式整份空白時一個字都不送出去', async () => {
    // 這條門以前不存在也不必存在：畫面會替使用者把外框接上去，
    // 一份「空的」算式送出去仍然是七行 package 與 import。現在存下去的就是編輯區
    // 那一份，少了這道門，空白會一路送到後端，換回一句畫面接不住的拒絕。
    const createStrategyScript = vi.fn()
    const strategyScriptApplication = buildApplication({ createStrategyScript })

    await expect(strategyScriptApplication.saveStrategyScript(
      new StrategyScriptWriteDto('二十根均線', new StrategyScriptContentDto('   ', 'floatList'))))
      .rejects.toBeInstanceOf(StrategyScriptFieldError)
    expect(createStrategyScript).not.toHaveBeenCalled()
  })

  it.each([
    { name: '完全沒填', declaredName: '' },
    { name: '只有空白字元', declaredName: '   ' },
  ])('名稱$name時一個字都不送出去', async ({ declaredName }) => {
    const createStrategyScript = vi.fn()
    const updateStrategyScript = vi.fn()
    const strategyScriptApplication = buildApplication({ createStrategyScript, updateStrategyScript })

    await expect(strategyScriptApplication.saveStrategyScript(
      new StrategyScriptWriteDto(declaredName, contentOf()))).rejects.toBeInstanceOf(StrategyScriptFieldError)
    expect(createStrategyScript).not.toHaveBeenCalled()
    expect(updateStrategyScript).not.toHaveBeenCalled()
  })

  it('名稱被別的策略腳本用掉時如實轉達', async () => {
    const strategyScriptApplication = buildApplication({
      createStrategyScript: vi.fn().mockRejectedValue(new StrategyScriptNameConflictError('已被使用')),
    })

    await expect(strategyScriptApplication.saveStrategyScript(new StrategyScriptWriteDto('二十根均線', contentOf())))
      .rejects.toBeInstanceOf(StrategyScriptNameConflictError)
  })

  it('要改寫的那一支已經不在時如實轉達', async () => {
    const strategyScriptApplication = buildApplication({
      updateStrategyScript: vi.fn().mockRejectedValue(new StrategyScriptNotFoundError('找不到')),
    })

    await expect(strategyScriptApplication.saveStrategyScript(new StrategyScriptWriteDto('二十根均線', contentOf(), 7)))
      .rejects.toBeInstanceOf(StrategyScriptNotFoundError)
  })
})

describe('StrategyScriptApplication.deleteStrategyScript', () => {
  it('刪掉指名的那一支', async () => {
    const deleteStrategyScript = vi.fn().mockResolvedValue(undefined)
    const strategyScriptApplication = buildApplication({ deleteStrategyScript })

    await strategyScriptApplication.deleteStrategyScript(7)

    expect(deleteStrategyScript).toHaveBeenCalledWith(7)
  })

  it('那一支已經不在時如實轉達', async () => {
    const strategyScriptApplication = buildApplication({
      deleteStrategyScript: vi.fn().mockRejectedValue(new StrategyScriptNotFoundError('找不到')),
    })

    await expect(strategyScriptApplication.deleteStrategyScript(7))
      .rejects.toBeInstanceOf(StrategyScriptNotFoundError)
  })
})

describe('StrategyScriptApplication.hasUnsavedChanges', () => {
  it('載入之後一個字都沒改就不必問', () => {
    const strategyScriptApplication = buildApplication({})

    expect(strategyScriptApplication.hasUnsavedChanges(contentOf(), contentOf())).toBe(false)
  })

  it('改過了就要問', () => {
    const strategyScriptApplication = buildApplication({})

    expect(strategyScriptApplication.hasUnsavedChanges(contentOf(), contentOf('sum := 1.0'))).toBe(true)
  })

  it('還沒載入過任何策略腳本但已經寫了東西時要問', () => {
    const strategyScriptApplication = buildApplication({})

    expect(strategyScriptApplication.hasUnsavedChanges(null, contentOf('sum := 0.0'))).toBe(true)
  })

  it('還沒載入過任何策略腳本且什麼都沒寫時不必問', () => {
    const strategyScriptApplication = buildApplication({})

    expect(strategyScriptApplication.hasUnsavedChanges(null, contentOf(''))).toBe(false)
  })
})
