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
            new IndicatorCalculation('BTCUSDT', 3, 'float', [])),
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

async function pickStrategy(wrapper: ReturnType<typeof mountPanel>, id: number) {
  await wrapper.get('[data-testid="strategy-picker-select"]').setValue(String(id))
  await settle()
}

describe('指標計算畫面上的策略：挑一支來用', () => {
  it('挑一支就把它記住的四樣東西全部帶進畫面', async () => {
    const wrapper = mountPanel({
      listStrategies: vi.fn().mockResolvedValue([
        buildStoredStrategy(7, '二十根均線', {
          scriptBody: 'sum := 123.0', resultType: 'boolList',
          aggregationInterval: '4h', candleCount: 45,
        }),
      ]),
    })
    await settle()

    await pickStrategy(wrapper, 7)

    expect(scriptBodyText(wrapper)).toContain('sum := 123.0')
    expect(wrapper.get<HTMLSelectElement>('[data-testid="result-type-select"]').element.value)
      .toBe('boolList')
    expect(wrapper.get<HTMLSelectElement>('[data-testid="aggregation-interval-select"]').element.value)
      .toBe('4h')
    expect(wrapper.get<HTMLInputElement>('[data-testid="candle-count-input"]').element.value)
      .toBe('45')
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

    await wrapper.findAll('button').filter(b => b.text() === '放棄並載入')[0]?.trigger('click')
    await settle()

    expect(scriptBodyText(wrapper)).toContain('sum := 123.0')
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

    const confirmButtons = wrapper.findAll('button')
      .filter(button => button.text() === '刪除' && button.classes().includes('app-button--danger'))
    expect(confirmButtons).toHaveLength(1)
    await confirmButtons[0]!.trigger('click')
    await settle()

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
  it('選單在，且說明它目前還沒生效', async () => {
    const wrapper = mountPanel()
    await settle()

    expect(wrapper.find('[data-testid="aggregation-interval-select"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('目前計算仍以五分鐘執行')
  })

  it('沒挑時是五分鐘', async () => {
    const wrapper = mountPanel()
    await settle()

    expect(wrapper.get<HTMLSelectElement>('[data-testid="aggregation-interval-select"]').element.value)
      .toBe('5m')
  })
})
