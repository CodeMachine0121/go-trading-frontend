// @vitest-environment nuxt
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { useStrategyScriptLibrary } from '~/composables/use-strategy-script-library'
import { StrategyScriptContentDto } from '~/domain/models/dto/strategy-script-content-dto'
import { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'
import {
  buildAdoptedStrategyScript,
  buildStoredStrategyScript,
  buildStrategyScriptApplication,
} from '../fixtures/strategy-script-application'

// 只 mock 最外層的 proxy：application、domain service 與 domain model 都是真的，
// 「有沒有還沒存的東西」因此是真的那一條規則在答。

const BLANK = new StrategyScriptContentDto('', 'float', [])
const PERIOD = new StrategyScriptParameterDto('週期', 'lookbackCount', 20)

/**
 * 掛起一份策略腳本庫，外加一個代替畫面的工作區——它收下套上來的內容，
 * 也交得出現在畫面上是什麼。
 */
async function libraryUnderTest(adoptedLater: boolean = true) {
  const listAvailableStrategyScripts = vi.fn().mockResolvedValue({
    mine: [buildStoredStrategyScript(1, 'RSI 背離', { script: 'sum := 1.0', resultType: 'float' })],
    adopted: [buildAdoptedStrategyScript(9, '均線交叉', { resultType: 'floatList', parameters: [PERIOD] })],
  })
  const workspace = { content: BLANK }
  const applyContent = vi.fn((content: StrategyScriptContentDto) => {
    workspace.content = content
  })
  const deleteStrategyScript = vi.fn().mockImplementation(async () => {
    listAvailableStrategyScripts.mockResolvedValue({
      mine: [buildStoredStrategyScript(1, 'RSI 背離', { script: 'sum := 1.0', resultType: 'float' })],
      adopted: [],
    })
  })
  const library = useStrategyScriptLibrary(
    buildStrategyScriptApplication({ listAvailableStrategyScripts, deleteStrategyScript }),
    () => workspace.content,
    applyContent,
    BLANK)
  await library.refreshStrategyScripts()

  if (!adoptedLater) {
    listAvailableStrategyScripts.mockResolvedValue({
      mine: [buildStoredStrategyScript(1, 'RSI 背離', { script: 'sum := 1.0', resultType: 'float' })],
      adopted: [],
    })
  }

  return { library, workspace, applyContent, deleteStrategyScript }
}

describe('useStrategyScriptLibrary 挑到我加入的那一支', () => {
  it('工作區換上它自己的種類與旋鈕、算式是空的，而且是唯讀的', async () => {
    const { library, applyContent } = await libraryUnderTest()

    library.selectStrategyScript(9)

    expect(library.activeAdoptedStrategyScript.value?.name).toBe('均線交叉')
    expect(library.readOnly.value).toBe(true)
    expect(library.namedStrategyScriptId.value).toBe(9)
    expect(library.activeStrategyScript.value).toBeNull()
    expect(library.openDialog.value).toBe('none')
    const applied = applyContent.mock.calls.at(-1)![0]
    expect(applied.script).toBe('')
    expect(applied.resultType).toBe('floatList')
    expect(applied.parameters).toEqual([PERIOD])
  })

  it('從自己的一支挑到我加入的，使用中的就不再是自己那一支——儲存不會蓋回它', async () => {
    const { library } = await libraryUnderTest()
    library.selectStrategyScript(1)

    library.selectStrategyScript(9)

    expect(library.activeStrategyScript.value).toBeNull()
  })

  it('從唯讀挑自己的一支不必確認，工作區不再唯讀', async () => {
    const { library } = await libraryUnderTest()
    library.selectStrategyScript(9)

    library.selectStrategyScript(1)

    expect(library.openDialog.value).toBe('none')
    expect(library.activeAdoptedStrategyScript.value).toBeNull()
    expect(library.readOnly.value).toBe(false)
    expect(library.namedStrategyScriptId.value).toBeUndefined()
    expect(library.activeStrategyScript.value?.name).toBe('RSI 背離')
  })

  it('從唯讀開一份空白不必確認，工作區不再唯讀', async () => {
    const { library } = await libraryUnderTest()
    library.selectStrategyScript(9)

    library.startBlankStrategyScript()

    expect(library.openDialog.value).toBe('none')
    expect(library.activeAdoptedStrategyScript.value).toBeNull()
  })

  it('自己的一支改了一半沒存時，先問要不要丟掉；答應之後才進唯讀', async () => {
    const { library, workspace } = await libraryUnderTest()
    library.selectStrategyScript(1)
    workspace.content = new StrategyScriptContentDto('sum := 2.0', 'float', [])

    library.selectStrategyScript(9)
    expect(library.openDialog.value).toBe('discard')
    expect(library.activeAdoptedStrategyScript.value).toBeNull()

    library.confirmDiscard()
    expect(library.activeAdoptedStrategyScript.value?.name).toBe('均線交叉')
  })

  it('載入自己的一支時工作區不是唯讀的', async () => {
    const { library } = await libraryUnderTest()

    library.selectStrategyScript(1)

    expect(library.activeAdoptedStrategyScript.value).toBeNull()
  })

  it('重讀清單時它已經不在了，工作區仍然是它——重讀不順手換掉使用中的那一支', async () => {
    const { library } = await libraryUnderTest(false)
    library.selectStrategyScript(9)

    await library.refreshStrategyScripts()
    await flushPromises()

    expect(library.activeAdoptedStrategyScript.value?.name).toBe('均線交叉')
  })

  it('刪掉工作區裡那一份副本時，工作區換成一份空白、不再唯讀', async () => {
    const { library, applyContent, deleteStrategyScript } = await libraryUnderTest()
    library.selectStrategyScript(9)

    await library.deleteAdoptedStrategyScript(9)

    // 副本是自己的策略腳本，刪掉它走的就是刪除策略腳本那一條路；重讀之後它就不在清單上了。
    expect(deleteStrategyScript).toHaveBeenCalledWith(9)
    expect(library.adoptedStrategyScripts.value.map(adopted => adopted.id)).not.toContain(9)
    expect(library.noticeMessage.value).toBe('已刪掉這份副本；原本那一支不受影響，要的話到市集再加一次。')
    expect(library.readOnly.value).toBe(false)
    expect(library.namedStrategyScriptId.value).toBeUndefined()
    expect(applyContent).toHaveBeenLastCalledWith(BLANK)
  })

  it('刪掉的是另一份時，工作區裡那一支照舊', async () => {
    const { library } = await libraryUnderTest()
    library.selectStrategyScript(9)

    await library.deleteAdoptedStrategyScript(10)

    expect(library.activeAdoptedStrategyScript.value?.name).toBe('均線交叉')
  })
})

describe('useStrategyScriptLibrary 離開這一頁之前要不要先問', () => {
  it.each([
    { name: '剛打開、什麼都沒寫：不必問', edited: null, expected: false },
    { name: '載入一支之後又改了它：要先問', edited: 'sum := 2.0', expected: true },
    { name: '改了又改回原樣：不必問', edited: 'sum := 1.0', expected: false },
  ])('$name', async ({ edited, expected }) => {
    const { library, workspace } = await libraryUnderTest()
    if (edited !== null) {
      library.selectStrategyScript(1)
      workspace.content = new StrategyScriptContentDto(edited, 'float', [])
    }

    expect(library.hasUnsavedDraft()).toBe(expected)
  })
})
