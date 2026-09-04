import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import IndicatorCalculationPanel from '~/components/organisms/IndicatorCalculationPanel.vue'
import { IndicatorCalculationApplication } from '~/application/indicator-calculation-application'
import { IndicatorCalculationService } from '~/domain/service/indicator-calculation-service'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import type { IStrategyProxy } from '~/domain/interface/i-strategy-proxy'
import { StrategyNameConflictError } from '~/domain/errors/strategy-name-conflict-error'
import { StrategyNotFoundError } from '~/domain/errors/strategy-not-found-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'
import { buildStrategyApplication, buildStoredStrategy } from '../../fixtures/strategy-application'
import { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'

// 只 mock 最外層的 proxy 介面；application、domain service 與所有 domain model 都是真的。

/** 算式內容住在編輯區裡，而編輯區是掛載後才動態載入的，microtask 還輪不到它。 */
async function settle() {
  await new Promise(resolve => setTimeout(resolve, 20))
  await flushPromises()
}

function mountPanel(strategyProxy: Partial<IStrategyProxy> = {}) {
  return mount(IndicatorCalculationPanel, {
    props: {
      indicatorCalculationApplication: new IndicatorCalculationApplication(
        new IndicatorCalculationService({
          calculateIndicator: vi.fn().mockResolvedValue(
            new IndicatorCalculation('BTCUSDT', '5m', 3, 'float', [])),
        })),
      strategyApplication: buildStrategyApplication(strategyProxy),
      tradingSymbolApplication: buildTradingSymbolApplication(),
    },
  })
}

/** 從畫面上把算式內容打進去——走的是使用者真正會走的那條路。 */
async function typeScriptBody(wrapper: ReturnType<typeof mountPanel>, scriptBody: string) {
  await settle()
  const editor = wrapper.get('[data-testid="script-body"]').element
  const firstLine = editor.querySelector('.cm-line')
  if (firstLine === null) {
    throw new Error('編輯區還沒準備好')
  }

  firstLine.textContent = scriptBody
  editor.querySelector('.cm-content')!.dispatchEvent(new Event('input', { bubbles: true }))
  await settle()
}

function scriptBodyText(wrapper: ReturnType<typeof mountPanel>): string {
  return wrapper.get('[data-testid="script-body"]').element
    .querySelector('.cm-content')?.textContent ?? ''
}

/** 按下刪除確認裡那一顆真正的刪除鈕——與清單上那幾顆同名，靠樣式變體分辨。 */
async function confirmDelete(wrapper: ReturnType<typeof mountPanel>) {
  const confirmButtons = wrapper.findAll('button')
    .filter(button => button.text() === '刪除' && button.classes().includes('app-button--danger'))
  expect(confirmButtons).toHaveLength(1)
  await confirmButtons[0]!.trigger('click')
  await settle()
}

async function pickStrategy(wrapper: ReturnType<typeof mountPanel>, id: number) {
  await wrapper.get('[data-testid="strategy-picker-select"]').setValue(String(id))
  await settle()
}

/** 按下「新的空白策略」——編輯器裡的「開新檔案」。 */
async function startBlankStrategy(wrapper: ReturnType<typeof mountPanel>) {
  await wrapper.get('[data-testid="new-strategy-button"]').trigger('click')
  await settle()
}

/** 在「放棄尚未儲存的變更？」裡說「好」。兩個觸發點（載入另一支、開一份空白）共用它。 */
async function discardAndProceed(wrapper: ReturnType<typeof mountPanel>) {
  const confirmButtons = wrapper.findAll('button').filter(button => button.text() === '放棄並繼續')
  expect(confirmButtons).toHaveLength(1)
  await confirmButtons[0]!.trigger('click')
  await settle()
}

describe('指標計算畫面上的策略：挑一支來用', () => {
  it('挑一支就把它記住的算法帶進畫面', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([
        buildStoredStrategy(7, '二十根均線', {
          scriptBody: 'sum := 123.0', resultType: 'boolList',
        }),
      ]),
    })
    await settle()

    await pickStrategy(wrapper, 7)

    expect(scriptBodyText(wrapper)).toContain('sum := 123.0')
    expect(wrapper.get<HTMLSelectElement>('[data-testid="result-type-select"]').element.value)
      .toBe('boolList')
  })

  it('挑一支不會動到這一次的執行設定', async () => {
    // 彙總刻度與要看多長跟交易標的同一類：它們是「這一次要怎麼算」。
    // 使用者正在用一小時的粗細研究一件事，換一支算法不該把他打回五分鐘。
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([buildStoredStrategy(7, '二十根均線')]),
    })
    await settle()
    await wrapper.get('[data-testid="aggregation-interval-select"]').setValue('1h')
    await wrapper.get('[data-testid="span-amount-input"]').setValue('6')

    await pickStrategy(wrapper, 7)

    expect(wrapper.get<HTMLSelectElement>('[data-testid="aggregation-interval-select"]').element.value)
      .toBe('1h')
    expect(wrapper.get<HTMLInputElement>('[data-testid="span-amount-input"]').element.value)
      .toBe('6')
  })

  it('挑一支不會動到交易標的——策略不記交易標的', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([buildStoredStrategy(7, '二十根均線')]),
    })
    await settle()
    const symbolBefore = wrapper.get<HTMLSelectElement>('[data-testid="symbol-select"]').element.value

    await pickStrategy(wrapper, 7)

    expect(wrapper.get<HTMLSelectElement>('[data-testid="symbol-select"]').element.value)
      .toBe(symbolBefore)
  })

  it('認不出外框的算式整段帶進來，並說出這一支不是在這裡寫出來的', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([
        buildStoredStrategy(7, '手寫的', { rawScript: '這根本不是一段程式碼' }),
      ]),
    })
    await settle()

    await pickStrategy(wrapper, 7)

    expect(scriptBodyText(wrapper)).toContain('這根本不是一段程式碼')
    expect(wrapper.get('[data-testid="strategy-notice"]').text()).toContain('認不出外框')
  })
})

describe('指標計算畫面上的策略：不弄丟寫到一半的東西', () => {
  it('編輯區還沒動過時直接帶入，不多問', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([buildStoredStrategy(7, '二十根均線')]),
    })
    await settle()

    await pickStrategy(wrapper, 7)

    expect(wrapper.text()).not.toContain('放棄尚未儲存的變更')
    expect(scriptBodyText(wrapper)).toContain('sum := 0.0')
  })

  it.each([
    { changed: '彙總刻度', selector: '[data-testid="aggregation-interval-select"]', value: '1h' },
    { changed: '要看多長', selector: '[data-testid="span-amount-input"]', value: '6' },
  ])('只改了$changed 時不問——它不屬於任何一支策略，沒有東西會被弄丟', async ({ selector, value }) => {
    // 該問卻不問會弄丟使用者寫的東西；不該問卻問，只會讓他學會無視那個對話框，
    // 而它在真正要緊的時候必須被讀。
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([
        buildStoredStrategy(7, '二十根均線'),
        buildStoredStrategy(8, '六十根均線', { scriptBody: 'sum := 456.0' }),
      ]),
    })
    await settle()
    await pickStrategy(wrapper, 7)
    await wrapper.get(selector).setValue(value)

    await pickStrategy(wrapper, 8)

    expect(wrapper.text()).not.toContain('放棄尚未儲存的變更')
    expect(scriptBodyText(wrapper)).toContain('sum := 456.0')
  })

  it('已經寫了東西時先問過再覆蓋', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([buildStoredStrategy(7, '二十根均線')]),
    })
    await settle()
    await typeScriptBody(wrapper, '我寫到一半的東西')

    await pickStrategy(wrapper, 7)

    expect(wrapper.text()).toContain('放棄尚未儲存的變更')
    expect(scriptBodyText(wrapper)).toContain('我寫到一半的東西')
  })

  it('說不要放棄時畫面完全不變', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([buildStoredStrategy(7, '二十根均線')]),
    })
    await settle()
    await typeScriptBody(wrapper, '我寫到一半的東西')
    await pickStrategy(wrapper, 7)

    await wrapper.findAll('button').filter(button => button.text() === '取消')[0]?.trigger('click')
    await settle()

    expect(scriptBodyText(wrapper)).toContain('我寫到一半的東西')
  })

  it('說要放棄時才換成新挑的那一支', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([
        buildStoredStrategy(7, '二十根均線', { scriptBody: 'sum := 123.0' }),
      ]),
    })
    await settle()
    await typeScriptBody(wrapper, '我寫到一半的東西')
    await pickStrategy(wrapper, 7)

    await discardAndProceed(wrapper)
    await settle()

    expect(scriptBodyText(wrapper)).toContain('sum := 123.0')
  })

  it('載入了一支又改過它，再挑另一支時要問', async () => {
    // US-02 真正的主線：手上已經有一支、也已經動過它。前面幾個案例都是「還沒載入過」。
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([
        buildStoredStrategy(7, '二十根均線', { scriptBody: 'sum := 123.0' }),
        buildStoredStrategy(8, '六十根均線', { scriptBody: 'sum := 456.0' }),
      ]),
    })
    await settle()
    await pickStrategy(wrapper, 7)
    await typeScriptBody(wrapper, '我改過的東西')

    await pickStrategy(wrapper, 8)

    expect(wrapper.text()).toContain('放棄尚未儲存的變更')
    expect(scriptBodyText(wrapper)).toContain('我改過的東西')
  })

  it('載入之後一個字都沒改，再挑另一支不再問', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([
        buildStoredStrategy(7, '二十根均線', { scriptBody: 'sum := 123.0' }),
        buildStoredStrategy(8, '六十根均線', { scriptBody: 'sum := 456.0' }),
      ]),
    })
    await settle()
    await pickStrategy(wrapper, 7)

    await pickStrategy(wrapper, 8)

    expect(wrapper.text()).not.toContain('放棄尚未儲存的變更')
    expect(scriptBodyText(wrapper)).toContain('sum := 456.0')
  })
})

describe('指標計算畫面上的策略：存回去', () => {
  it('有使用中的那一支時，儲存存回它而不是建立新的', async () => {
    const updateStrategy = vi.fn().mockResolvedValue(buildStoredStrategy(7, '二十根均線'))
    const createStrategy = vi.fn()
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([buildStoredStrategy(7, '二十根均線')]),
      updateStrategy,
      createStrategy,
    })
    await settle()
    await pickStrategy(wrapper, 7)

    await wrapper.get('[data-testid="save-strategy-button"]').trigger('click')
    await settle()

    expect(updateStrategy).toHaveBeenCalledOnce()
    expect(createStrategy).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="strategy-notice"]').text()).toContain('已儲存')
  })

  it('沒有使用中的那一支時，儲存先問名字', async () => {
    const wrapper = mountPanel()
    await settle()
    await typeScriptBody(wrapper, 'sum := 0.0')

    await wrapper.get('[data-testid="save-strategy-button"]').trigger('click')
    await settle()

    expect(wrapper.find('[data-testid="strategy-name-input"]').exists()).toBe(true)
  })

  it('填完名字就建立一支新的，之後使用中的就是它', async () => {
    const createStrategy = vi.fn().mockResolvedValue(buildStoredStrategy(9, '新的一支'))
    const updateStrategy = vi.fn().mockResolvedValue(buildStoredStrategy(9, '新的一支'))
    const wrapper = mountPanel({
      createStrategy,
      updateStrategy,
      listStrategies: vi.fn().mockResolvedValue([buildStoredStrategy(9, '新的一支')]),
    })
    await settle()
    await typeScriptBody(wrapper, 'sum := 0.0')
    await wrapper.get('[data-testid="save-as-strategy-button"]').trigger('click')
    await wrapper.get('[data-testid="strategy-name-input"]').setValue('新的一支')

    await wrapper.get('[data-testid="strategy-name-submit"]').trigger('click')
    await settle()

    expect(createStrategy).toHaveBeenCalledOnce()
    expect(wrapper.get<HTMLSelectElement>('[data-testid="strategy-picker-select"]').element.value)
      .toBe('9')

    // 接下來按儲存存的是新的那一支，不是再建一次。
    await wrapper.get('[data-testid="save-strategy-button"]').trigger('click')
    await settle()
    expect(updateStrategy).toHaveBeenCalledOnce()
    expect(createStrategy).toHaveBeenCalledOnce()
  })

  it('從既有的一支另存出新的一支，原本那一支不受影響', async () => {
    const createStrategy = vi.fn().mockResolvedValue(buildStoredStrategy(8, '二十根均線 v2'))
    const updateStrategy = vi.fn()
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([buildStoredStrategy(7, '二十根均線')]),
      createStrategy,
      updateStrategy,
    })
    await settle()
    await pickStrategy(wrapper, 7)
    await typeScriptBody(wrapper, '衍生出來的東西')
    await wrapper.get('[data-testid="save-as-strategy-button"]').trigger('click')
    await wrapper.get('[data-testid="strategy-name-input"]').setValue('二十根均線 v2')

    await wrapper.get('[data-testid="strategy-name-submit"]').trigger('click')
    await settle()

    // 建立了新的一支，而且**沒有**去改寫原本那一支。
    expect(createStrategy).toHaveBeenCalledOnce()
    expect(updateStrategy).not.toHaveBeenCalled()
  })

  it('存完之後就不再算有未儲存的變更', async () => {
    // 存好了卻還說「有東西沒存」，會讓使用者每挑一支都被問一次——
    // 而那個問題的答案永遠是「放棄吧，反正已經存過了」。
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([
        buildStoredStrategy(7, '二十根均線'),
        buildStoredStrategy(8, '六十根均線', { scriptBody: 'sum := 456.0' }),
      ]),
      updateStrategy: vi.fn().mockResolvedValue(
        buildStoredStrategy(7, '二十根均線', { scriptBody: '我改過的東西' })),
    })
    await settle()
    await pickStrategy(wrapper, 7)
    await typeScriptBody(wrapper, '我改過的東西')
    await wrapper.get('[data-testid="save-strategy-button"]').trigger('click')
    await settle()

    await pickStrategy(wrapper, 8)

    expect(wrapper.text()).not.toContain('放棄尚未儲存的變更')
    expect(scriptBodyText(wrapper)).toContain('sum := 456.0')
  })

  it('名稱被佔用時對話框不關閉、就地說明，畫面內容一字不動', async () => {
    const wrapper = mountPanel({
      createStrategy: vi.fn().mockRejectedValue(
        new StrategyNameConflictError('策略名稱「二十根均線」已被使用')),
    })
    await settle()
    await typeScriptBody(wrapper, '我寫的東西')
    await wrapper.get('[data-testid="save-as-strategy-button"]').trigger('click')
    await wrapper.get('[data-testid="strategy-name-input"]').setValue('二十根均線')

    await wrapper.get('[data-testid="strategy-name-submit"]').trigger('click')
    await settle()

    expect(wrapper.find('[data-testid="strategy-name-input"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="field-error"]').text()).toContain('已被使用')
    expect(scriptBodyText(wrapper)).toContain('我寫的東西')
  })

  it('要存回去的那一支已經不在時說找不到，畫面內容一字不動', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([buildStoredStrategy(7, '二十根均線')]),
      updateStrategy: vi.fn().mockRejectedValue(new StrategyNotFoundError('找不到識別碼為 7 的策略')),
    })
    await settle()
    await pickStrategy(wrapper, 7)
    await typeScriptBody(wrapper, '我改過的東西')

    await wrapper.get('[data-testid="save-strategy-button"]').trigger('click')
    await settle()

    expect(wrapper.get('[data-testid="strategy-error"]').text()).toContain('找不到')
    expect(scriptBodyText(wrapper)).toContain('我改過的東西')
  })

  it('連不上後端時說連不上，畫面內容一字不動', async () => {
    const wrapper = mountPanel({
      createStrategy: vi.fn().mockRejectedValue(new BackendUnreachableError('http://localhost:8080')),
    })
    await settle()
    await typeScriptBody(wrapper, '我寫的東西')
    await wrapper.get('[data-testid="save-as-strategy-button"]').trigger('click')
    await wrapper.get('[data-testid="strategy-name-input"]').setValue('新的一支')

    await wrapper.get('[data-testid="strategy-name-submit"]').trigger('click')
    await settle()

    expect(wrapper.get('[data-testid="strategy-error"]').text()).toContain('連不上後端')
    expect(scriptBodyText(wrapper)).toContain('我寫的東西')
  })
})

describe('指標計算畫面上的策略：改名', () => {
  it('只有手上真的有一支時才改得了名字', async () => {
    const wrapper = mountPanel()
    await settle()

    expect(wrapper.get('[data-testid="rename-strategy-button"]').attributes('disabled'))
      .toBeDefined()
  })

  it('改名的框裡先放著現在的名字', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([buildStoredStrategy(7, '二十根均線')]),
    })
    await settle()
    await pickStrategy(wrapper, 7)

    await wrapper.get('[data-testid="rename-strategy-button"]').trigger('click')
    await settle()

    expect(wrapper.get<HTMLInputElement>('[data-testid="strategy-name-input"]').element.value)
      .toBe('二十根均線')
  })

  it('改名送出的是同一支策略，只有名字換了', async () => {
    const updateStrategy = vi.fn().mockResolvedValue(buildStoredStrategy(7, '均線 20'))
    const createStrategy = vi.fn()
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([buildStoredStrategy(7, '二十根均線')]),
      updateStrategy,
      createStrategy,
    })
    await settle()
    await pickStrategy(wrapper, 7)
    await wrapper.get('[data-testid="rename-strategy-button"]').trigger('click')
    await settle()
    await wrapper.get('[data-testid="strategy-name-input"]').setValue('均線 20')

    await wrapper.get('[data-testid="strategy-name-submit"]').trigger('click')
    await settle()

    // 改的是原本那一支，不是複製出新的一支。
    expect(createStrategy).not.toHaveBeenCalled()
    expect(updateStrategy).toHaveBeenCalledOnce()
    expect(updateStrategy.mock.calls[0]?.[0].id).toBe(7)
    expect(updateStrategy.mock.calls[0]?.[0].name).toBe('均線 20')
  })

  it('改名之後畫面上顯示的就是新名字', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn()
        .mockResolvedValueOnce([buildStoredStrategy(7, '二十根均線')])
        .mockResolvedValue([buildStoredStrategy(7, '均線 20')]),
      updateStrategy: vi.fn().mockResolvedValue(buildStoredStrategy(7, '均線 20')),
    })
    await settle()
    await pickStrategy(wrapper, 7)
    await wrapper.get('[data-testid="rename-strategy-button"]').trigger('click')
    await settle()
    await wrapper.get('[data-testid="strategy-name-input"]').setValue('均線 20')

    await wrapper.get('[data-testid="strategy-name-submit"]').trigger('click')
    await settle()

    expect(wrapper.get('[data-testid="strategy-notice"]').text()).toContain('均線 20')
    expect(wrapper.findAll('option').map(option => option.text())).toContain('均線 20')
  })

  it('改名不會動到這一支記著的算式', async () => {
    const updateStrategy = vi.fn().mockResolvedValue(buildStoredStrategy(7, '均線 20'))
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([
        buildStoredStrategy(7, '二十根均線', { scriptBody: 'sum := 123.0' }),
      ]),
      updateStrategy,
    })
    await settle()
    await pickStrategy(wrapper, 7)
    await wrapper.get('[data-testid="rename-strategy-button"]').trigger('click')
    await settle()
    await wrapper.get('[data-testid="strategy-name-input"]').setValue('均線 20')

    await wrapper.get('[data-testid="strategy-name-submit"]').trigger('click')
    await settle()

    expect(updateStrategy.mock.calls[0]?.[0].script).toContain('sum := 123.0')
    expect(scriptBodyText(wrapper)).toContain('sum := 123.0')
  })

  it('改成別人用過的名字時退回改名的對話框，不是退回另存', async () => {
    // 被丟到一個自己沒打開過的對話框，比錯誤訊息本身更讓人困惑。
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([buildStoredStrategy(7, '二十根均線')]),
      updateStrategy: vi.fn().mockRejectedValue(
        new StrategyNameConflictError('策略名稱「六十根均線」已被使用')),
    })
    await settle()
    await pickStrategy(wrapper, 7)
    await wrapper.get('[data-testid="rename-strategy-button"]').trigger('click')
    await settle()
    await wrapper.get('[data-testid="strategy-name-input"]').setValue('六十根均線')

    await wrapper.get('[data-testid="strategy-name-submit"]').trigger('click')
    await settle()

    expect(wrapper.text()).toContain('重新命名')
    expect(wrapper.text()).not.toContain('另存為新策略的名稱')
    expect(wrapper.get('[data-testid="field-error"]').text()).toContain('已被使用')
    expect(wrapper.get<HTMLInputElement>('[data-testid="strategy-name-input"]').element.value)
      .toBe('六十根均線')
  })

  it('儲存不會順手改掉名字——那是另一個動作', async () => {
    const updateStrategy = vi.fn().mockResolvedValue(buildStoredStrategy(7, '二十根均線'))
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([buildStoredStrategy(7, '二十根均線')]),
      updateStrategy,
    })
    await settle()
    await pickStrategy(wrapper, 7)
    await typeScriptBody(wrapper, '改過的內容')

    await wrapper.get('[data-testid="save-strategy-button"]').trigger('click')
    await settle()

    expect(updateStrategy.mock.calls[0]?.[0].name).toBe('二十根均線')
  })
})

describe('指標計算畫面上的策略：清單與刪除', () => {
  it('打開清單看得到每一支，載入之後留在同一頁', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([
        buildStoredStrategy(7, '二十根均線', { scriptBody: 'sum := 123.0' }),
        buildStoredStrategy(8, '六十根均線'),
      ]),
    })
    await settle()

    await wrapper.get('[data-testid="open-library-button"]').trigger('click')
    await settle()
    expect(wrapper.findAll('[data-testid="strategy-library-row"]')).toHaveLength(2)

    await wrapper.get('[data-testid="strategy-library-load-7"]').trigger('click')
    await settle()

    expect(wrapper.find('[data-testid="strategy-library-row"]').exists()).toBe(false)
    expect(scriptBodyText(wrapper)).toContain('sum := 123.0')
  })

  it('刪除前先問過；取消就不刪', async () => {
    const deleteStrategy = vi.fn()
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([buildStoredStrategy(7, '二十根均線')]),
      deleteStrategy,
    })
    await settle()
    await wrapper.get('[data-testid="open-library-button"]').trigger('click')
    await settle()

    await wrapper.get('[data-testid="strategy-library-delete-7"]').trigger('click')
    await settle()
    expect(wrapper.text()).toContain('刪掉就沒了')

    await wrapper.findAll('button').filter(b => b.text() === '取消')[0]?.trigger('click')
    await settle()
    expect(deleteStrategy).not.toHaveBeenCalled()
  })

  it('確認刪除之後那一支就從清單上消失', async () => {
    const listStrategies = vi.fn()
      .mockResolvedValueOnce([buildStoredStrategy(7, '二十根均線'), buildStoredStrategy(8, '六十根均線')])
      .mockResolvedValueOnce([buildStoredStrategy(7, '二十根均線'), buildStoredStrategy(8, '六十根均線')])
      .mockResolvedValue([buildStoredStrategy(8, '六十根均線')])
    const wrapper = mountPanel({ listStrategies, deleteStrategy: vi.fn().mockResolvedValue(undefined) })
    await settle()
    await wrapper.get('[data-testid="open-library-button"]').trigger('click')
    await settle()
    await wrapper.get('[data-testid="strategy-library-delete-7"]').trigger('click')
    await settle()

    await confirmDelete(wrapper)

    const rows = wrapper.findAll('[data-testid="strategy-library-row"]')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.text()).toContain('六十根均線')
  })

  it('刪掉別的那一支時，正在用的那一支完全不受影響', async () => {
    const listStrategies = vi.fn()
      .mockResolvedValue([
        buildStoredStrategy(7, '二十根均線', { scriptBody: 'sum := 123.0' }),
        buildStoredStrategy(8, '六十根均線'),
      ])
    const wrapper = mountPanel({ listStrategies, deleteStrategy: vi.fn().mockResolvedValue(undefined) })
    await settle()
    await pickStrategy(wrapper, 7)
    await wrapper.get('[data-testid="open-library-button"]').trigger('click')
    await settle()
    await wrapper.get('[data-testid="strategy-library-delete-8"]').trigger('click')
    await settle()

    await confirmDelete(wrapper)

    // 內容留著，而且「正在用第 7 支」這個關聯也還在——只有刪到自己時才該解除。
    expect(scriptBodyText(wrapper)).toContain('sum := 123.0')
    expect(wrapper.get<HTMLSelectElement>('[data-testid="strategy-picker-select"]').element.value)
      .toBe('7')
  })

  it('刪除時連不上後端，那一支仍在清單上並說明連不上', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([buildStoredStrategy(7, '二十根均線')]),
      deleteStrategy: vi.fn().mockRejectedValue(new BackendUnreachableError('http://localhost:8080')),
    })
    await settle()
    await wrapper.get('[data-testid="open-library-button"]').trigger('click')
    await settle()
    await wrapper.get('[data-testid="strategy-library-delete-7"]').trigger('click')
    await settle()

    await confirmDelete(wrapper)

    expect(wrapper.findAll('[data-testid="strategy-library-row"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="strategy-error"]').text()).toContain('連不上後端')
  })

  it('刪掉正在用的那一支時，編輯區留著，之後儲存變成先問名字', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([buildStoredStrategy(7, '二十根均線')]),
      deleteStrategy: vi.fn().mockResolvedValue(undefined),
    })
    await settle()
    await pickStrategy(wrapper, 7)
    await wrapper.get('[data-testid="open-library-button"]').trigger('click')
    await settle()
    await wrapper.get('[data-testid="strategy-library-delete-7"]').trigger('click')
    await settle()

    await confirmDelete(wrapper)

    // 編輯區的內容留著不動——使用者的工作不能被另一個動作弄丟。
    expect(scriptBodyText(wrapper)).toContain('sum := 0.0')

    await wrapper.get('.app-modal__close').trigger('click')
    await settle()
    await wrapper.get('[data-testid="save-strategy-button"]').trigger('click')
    await settle()
    expect(wrapper.find('[data-testid="strategy-name-input"]').exists()).toBe(true)
  })

  it('打開清單時連不上後端就說連不上，不呈現空清單', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockRejectedValue(new BackendUnreachableError('http://localhost:8080')),
    })
    await settle()

    await wrapper.get('[data-testid="open-library-button"]').trigger('click')
    await settle()

    expect(wrapper.get('[data-testid="strategy-library-error"]').text()).toContain('連不上後端')
    expect(wrapper.find('[data-testid="strategy-library-empty"]').exists()).toBe(false)
  })
})

describe('指標計算畫面上的策略：彙總刻度', () => {
  it('選單在，且不再說它還沒生效', async () => {
    // 這個欄位曾經只被記下來、計算完全不理它，畫面因此得在旁邊寫一句道歉。
    // 它現在真的生效了，那句話必須消失——留著就是說謊。
    const wrapper = mountPanel()
    await settle()

    expect(wrapper.find('[data-testid="aggregation-interval-select"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('目前計算仍以五分鐘執行')
  })

  it('沒挑時是五分鐘', async () => {
    const wrapper = mountPanel()
    await settle()

    expect(wrapper.get<HTMLSelectElement>('[data-testid="aggregation-interval-select"]').element.value)
      .toBe('5m')
  })
})

describe('指標計算畫面上的策略：開一份新的空白', () => {
  it('清空算式並把指標值種類帶回預設', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([
        buildStoredStrategy(7, '二十根均線', {
          scriptBody: 'sum := 123.0', resultType: 'boolList',
        }),
      ]),
    })
    await settle()
    await pickStrategy(wrapper, 7)

    await startBlankStrategy(wrapper)

    expect(scriptBodyText(wrapper)).not.toContain('sum := 123.0')
    expect(wrapper.get<HTMLSelectElement>('[data-testid="result-type-select"]').element.value)
      .toBe('float')
  })

  it('開一份新的空白也不動這一次的執行設定', async () => {
    // 「開新檔案」換掉的是稿子，不是使用者正在看的那個市場與粗細——
    // 與載入另一支策略同一個理由。
    const wrapper = mountPanel()
    await settle()
    await wrapper.get('[data-testid="aggregation-interval-select"]').setValue('4h')
    await wrapper.get('[data-testid="span-amount-input"]').setValue('6')

    await startBlankStrategy(wrapper)

    expect(wrapper.get<HTMLSelectElement>('[data-testid="aggregation-interval-select"]').element.value)
      .toBe('4h')
    expect(wrapper.get<HTMLInputElement>('[data-testid="span-amount-input"]').element.value)
      .toBe('6')
  })

  it('解除與那一支的關聯——之後按儲存是問新名字，不是存回原本那一支', async () => {
    const updateStrategy = vi.fn()
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([buildStoredStrategy(7, '二十根均線')]),
      updateStrategy,
    })
    await settle()
    await pickStrategy(wrapper, 7)
    await startBlankStrategy(wrapper)

    await wrapper.get('[data-testid="save-strategy-button"]').trigger('click')
    await settle()

    expect(wrapper.find('[data-testid="strategy-name-input"]').exists()).toBe(true)
    expect(updateStrategy).not.toHaveBeenCalled()
    expect(wrapper.get<HTMLSelectElement>('[data-testid="strategy-picker-select"]').element.value)
      .toBe('')
  })

  it('交易標的不動——它不是策略記著的東西', async () => {
    const wrapper = mountPanel()
    await settle()
    await wrapper.get('[data-testid="symbol-select"]').setValue('ETHUSDT')

    await startBlankStrategy(wrapper)

    expect(wrapper.get<HTMLSelectElement>('[data-testid="symbol-select"]').element.value)
      .toBe('ETHUSDT')
  })

  it('上一次的計算結果不留在畫面上——它不是這份空白算出來的', async () => {
    const wrapper = mountPanel()
    await settle()
    // 算得出結果的前提是算式裡真的有東西，所以這一份稿子必然是「還沒存的」，
    // 於是清空之前一定會先問一次——這裡的重點在問完之後結果有沒有跟著走。
    await typeScriptBody(wrapper, 'sum := 1.0')
    // 送出走的是表單本身——happy-dom 不會把 submit 按鈕的點擊轉成 submit 事件。
    await wrapper.get('form').trigger('submit')
    await settle()
    expect(wrapper.find('[data-testid="used-candle-count"]').exists()).toBe(true)

    await startBlankStrategy(wrapper)
    await discardAndProceed(wrapper)

    expect(wrapper.find('[data-testid="used-candle-count"]').exists()).toBe(false)
  })

  it('上一次的失敗訊息不留——那是上一次計算的產物，與新的稿子無關', async () => {
    const wrapper = mountPanel()
    await settle()
    // 要看多長填成不合法的，送出後那一欄旁邊會紅一句話
    await wrapper.get('[data-testid="span-amount-input"]').setValue('0')
    await wrapper.get('form').trigger('submit')
    await settle()
    expect(wrapper.find('[data-testid="field-error"]').exists()).toBe(true)

    await startBlankStrategy(wrapper)

    expect(wrapper.find('[data-testid="field-error"]').exists()).toBe(false)
  })

  it('編輯區本來就空的時候也要說一聲，否則按鈕看起來像壞了', async () => {
    const wrapper = mountPanel()
    await settle()

    await startBlankStrategy(wrapper)

    expect(wrapper.get('[data-testid="strategy-notice"]').text()).toContain('新的空白策略')
  })

  it('有還沒存的東西時先問過，而且一個字都還沒被清掉', async () => {
    const wrapper = mountPanel()
    await settle()
    await typeScriptBody(wrapper, '我寫到一半的東西')

    await startBlankStrategy(wrapper)

    expect(wrapper.text()).toContain('放棄尚未儲存的變更')
    expect(scriptBodyText(wrapper)).toContain('我寫到一半的東西')
  })

  it('確認放棄之後才真的清空', async () => {
    const wrapper = mountPanel()
    await settle()
    await typeScriptBody(wrapper, '我寫到一半的東西')
    await startBlankStrategy(wrapper)

    await discardAndProceed(wrapper)

    expect(scriptBodyText(wrapper)).not.toContain('我寫到一半的東西')
  })

  it('取消就什麼都不動，也仍然屬於原本那一支', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([buildStoredStrategy(7, '二十根均線')]),
    })
    await settle()
    await pickStrategy(wrapper, 7)
    await typeScriptBody(wrapper, '我改到一半的東西')
    await startBlankStrategy(wrapper)

    await wrapper.findAll('button').filter(button => button.text() === '取消')[0]?.trigger('click')
    await settle()

    expect(scriptBodyText(wrapper)).toContain('我改到一半的東西')
    expect(wrapper.get<HTMLSelectElement>('[data-testid="strategy-picker-select"]').element.value)
      .toBe('7')
  })

  it('一份沒動過的空白再按一次不必問——沒有東西可以弄丟', async () => {
    const wrapper = mountPanel()
    await settle()
    await startBlankStrategy(wrapper)

    await startBlankStrategy(wrapper)

    expect(wrapper.text()).not.toContain('放棄尚未儲存的變更')
  })

  it('一次後端請求都不發，清單一支不增不減', async () => {
    const listStrategies = vi.fn().mockResolvedValue([
      buildStoredStrategy(1, '甲'), buildStoredStrategy(2, '乙'), buildStoredStrategy(3, '丙'),
    ])
    const createStrategy = vi.fn()
    const updateStrategy = vi.fn()
    const deleteStrategy = vi.fn()
    const wrapper = mountPanel({ listStrategies, createStrategy, updateStrategy, deleteStrategy })
    await settle()
    const listCallsBefore = listStrategies.mock.calls.length

    await startBlankStrategy(wrapper)

    expect(listStrategies.mock.calls).toHaveLength(listCallsBefore)
    expect(createStrategy).not.toHaveBeenCalled()
    expect(updateStrategy).not.toHaveBeenCalled()
    expect(deleteStrategy).not.toHaveBeenCalled()
    expect(wrapper.findAll('[data-testid="strategy-picker-select"] option')).toHaveLength(4)
  })

  it('後端連不上也照樣開得起來', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockRejectedValue(new BackendUnreachableError('/strategies')),
    })
    await settle()
    await typeScriptBody(wrapper, '我寫到一半的東西')

    await startBlankStrategy(wrapper)
    await discardAndProceed(wrapper)

    expect(scriptBodyText(wrapper)).not.toContain('我寫到一半的東西')
    expect(wrapper.find('[data-testid="strategy-error"]').exists()).toBe(false)
  })
})

describe('指標計算畫面上的策略：參數是策略內容', () => {
  // 判準與算式內容、指標值種類完全相同：「快線看二十根」不論拿去算哪一檔、
  // 用哪種粗細都一樣，它是這支算法的一部分。交易標的、彙總刻度、要看多長則不是——
  // 那些描述的是「這一次」，所以載入策略時它們不被覆蓋。

  async function addParameter(
    wrapper: ReturnType<typeof mountPanel>, name: string, value: string,
  ) {
    await wrapper.get('[data-testid="add-parameter-button"]').trigger('click')
    const row = wrapper.findAll('[data-testid="parameter-row"]').at(-1)!
    await row.get('[data-testid="parameter-name-input"]').setValue(name)
    await row.get('[data-testid="parameter-value-input"]').setValue(value)
    await settle()
  }

  it('挑一支就把它記住的參數一起帶進畫面', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([
        buildStoredStrategy(7, '布林通道', {
          parameters: [new StrategyParameterDto('期數', 'lookbackCount', 50)],
        }),
      ]),
    })
    await settle()

    await pickStrategy(wrapper, 7)

    const row = wrapper.get('[data-testid="parameter-row"]')
    expect(row.get<HTMLInputElement>('[data-testid="parameter-name-input"]').element.value)
      .toBe('期數')
    expect(row.get<HTMLInputElement>('[data-testid="parameter-value-input"]').element.value)
      .toBe('50')
  })

  it('挑一支沒有參數的策略，畫面上原本那幾格跟著清掉', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([buildStoredStrategy(7, '二十根均線')]),
    })
    await settle()
    await addParameter(wrapper, '期數', '50')

    await pickStrategy(wrapper, 7)
    await discardAndProceed(wrapper)

    expect(wrapper.findAll('[data-testid="parameter-row"]')).toHaveLength(0)
  })

  it('另存成一支新策略時，畫面上的參數跟著存進去', async () => {
    const createStrategy = vi.fn().mockResolvedValue(buildStoredStrategy(1, '布林通道'))
    const wrapper = mountPanel({ createStrategy })
    await typeScriptBody(wrapper, 'sum := 1.0')
    await addParameter(wrapper, '期數', '50')

    await wrapper.get('[data-testid="save-as-strategy-button"]').trigger('click')
    await wrapper.get('[data-testid="strategy-name-input"]').setValue('布林通道')
    await settle()
    await wrapper.get('[data-testid="strategy-name-submit"]').trigger('click')
    await settle()

    expect(createStrategy.mock.calls[0]![0].parameters).toEqual([
      expect.objectContaining({ name: '期數', kind: 'lookbackCount', value: 50 }),
    ])
  })
})
