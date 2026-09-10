import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import IndicatorCalculationPanel from '~/components/organisms/IndicatorCalculationPanel.vue'
import StrategyBacktestPane from '~/components/organisms/StrategyBacktestPane.vue'
import { IndicatorCalculationApplication } from '~/application/indicator-calculation-application'
import { IndicatorCalculationService } from '~/domain/service/indicator-calculation-service'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'
import { buildStrategyMarketplaceApplication, buildStrategyApplication, buildStoredStrategy } from '../../fixtures/strategy-application'
import { buildBacktestApplication } from '../../fixtures/backtest-application'
import { buildTimeZone } from '../../fixtures/time-zone'
import { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'

// 繪圖函式庫是最外層的邊界：它需要真正的畫布，而這裡要驗的不是它畫得對不對。
vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => ({
    addSeries: vi.fn(() => ({ setData: vi.fn() })),
    applyOptions: vi.fn(),
    timeScale: vi.fn(() => ({ fitContent: vi.fn() })),
    remove: vi.fn(),
  })),
  LineSeries: 'LineSeries',
}))

const SCRIPT_BODY = 'return map[string]float64{"signal": 1}'

/** 算式內容住在編輯區裡，而編輯區是掛載後才動態載入的，microtask 還輪不到它。 */
async function settle() {
  await new Promise(resolve => setTimeout(resolve, 20))
  await flushPromises()
}

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

function mountPanel(strategyApplication = buildStrategyApplication()) {
  const indicatorCalculationProxy: IIndicatorCalculationProxy = {
    calculateIndicator: vi.fn().mockResolvedValue(
      new IndicatorCalculation('BTCUSDT', '5m', 3, 'float', [])),
  }

  return mount(IndicatorCalculationPanel, {
    props: {
      indicatorCalculationApplication: new IndicatorCalculationApplication(
        new IndicatorCalculationService(indicatorCalculationProxy)),
      strategyApplication,
      strategyMarketplaceApplication: buildStrategyMarketplaceApplication(),
      tradingSymbolApplication: buildTradingSymbolApplication(),
      backtestApplication: buildBacktestApplication(),
      timeZone: buildTimeZone(),
    },
  })
}

function backtestPane(wrapper: ReturnType<typeof mountPanel>) {
  return wrapper.findComponent(StrategyBacktestPane)
}

describe('IndicatorCalculationPanel 的兩個去處', () => {
  it('一打開停在指標預覽', () => {
    const wrapper = mountPanel()

    expect(wrapper.get('[data-testid="tab-indicatorPreview"]').attributes('aria-selected'))
      .toBe('true')
  })

  it('兩個去處都掛著，只有一個看得見', async () => {
    // 用 v-show 而不是 v-if：填到一半的回測條件與已經算出來的結果都必須留著。
    const wrapper = mountPanel()
    await settle()

    expect(backtestPane(wrapper).exists()).toBe(true)
    expect(backtestPane(wrapper).attributes('style')).toContain('display: none')

    await wrapper.get('[data-testid="tab-backtest"]').trigger('click')

    expect(backtestPane(wrapper).attributes('style') ?? '').not.toContain('display: none')
  })

  it('切換去處不會弄丟寫到一半的算式', async () => {
    // 這是這一整塊存在的理由：工作區擺在切換之上，編輯器因此完全不受影響。
    const wrapper = mountPanel()
    await typeScriptBody(wrapper, SCRIPT_BODY)

    await wrapper.get('[data-testid="tab-backtest"]').trigger('click')
    await wrapper.get('[data-testid="tab-indicatorPreview"]').trigger('click')
    await settle()

    expect(wrapper.get('[data-testid="script-body"]').element
      .querySelector('.cm-content')?.textContent).toContain(SCRIPT_BODY)
  })

  it('工作區在左欄，去處在右欄——切換換掉的只有右邊那一欄', async () => {
    // 這是版面的那個決定本身：編輯器不在任何一個去處底下，所以切換碰不到它。
    // 驗的是巢狀結構而不是樣式——寬度是 CSS 的事，「誰包著誰」才是這個設計。
    const wrapper = mountPanel()
    await settle()

    const workbench = wrapper.get('.indicator-calculation-panel__workbench')
    const outcome = wrapper.get('.indicator-calculation-panel__outcome')

    expect(workbench.find('[data-testid="script-body"]').exists()).toBe(true)
    expect(workbench.find('[data-testid="tab-backtest"]').exists()).toBe(false)

    expect(outcome.find('[data-testid="tab-backtest"]').exists()).toBe(true)
    expect(outcome.find('[data-testid="calculate-button"]').exists()).toBe(true)
    expect(outcome.find('[data-testid="run-backtest-button"]').exists()).toBe(true)
    expect(outcome.find('[data-testid="script-body"]').exists()).toBe(false)
  })

  it('切過去再切回來，填到一半的回測條件一格都沒掉', async () => {
    // 他為了看一眼指標而離開，回來時不該發現自己得重填。
    const wrapper = mountPanel()
    await settle()

    await wrapper.get('[data-testid="tab-backtest"]').trigger('click')
    await wrapper.get('[data-testid="backtest-initial-capital-input"]').setValue('54321')
    await wrapper.get('[data-testid="backtest-start-time-input"]').setValue('2026-07-01T00:00')

    await wrapper.get('[data-testid="tab-indicatorPreview"]').trigger('click')
    await wrapper.get('[data-testid="tab-backtest"]').trigger('click')

    const capital = wrapper.get('[data-testid="backtest-initial-capital-input"]')
      .element as HTMLInputElement
    const start = wrapper.get('[data-testid="backtest-start-time-input"]')
      .element as HTMLInputElement
    expect(capital.value).toBe('54321')
    expect(start.value).toBe('2026-07-01T00:00')
  })

  it('算式是共用的那一份，回測看到的就是編輯區裡那一段', async () => {
    const wrapper = mountPanel()
    await typeScriptBody(wrapper, SCRIPT_BODY)

    expect(backtestPane(wrapper).props('scriptBody')).toContain(SCRIPT_BODY)
  })

  it('市場改在哪一邊，另一邊看到的就是改過的', async () => {
    const wrapper = mountPanel()
    await settle()

    backtestPane(wrapper).vm.$emit('update:symbol', 'ETHUSDT')
    await wrapper.vm.$nextTick()

    // 指標預覽那一格與回測那一格繫結的是同一個東西。
    expect(backtestPane(wrapper).props('symbol')).toBe('ETHUSDT')
  })

  it('彙總刻度同樣是共用的那一份', async () => {
    const wrapper = mountPanel()
    await settle()

    await wrapper.get('[data-testid="aggregation-interval-select"]').setValue('1h')

    expect(backtestPane(wrapper).props('aggregationInterval')).toBe('1h')
  })

  it('參數宣告也是共用的那一份', async () => {
    const wrapper = mountPanel()
    await settle()

    await wrapper.get('[data-testid="parameters-button"]').trigger('click')
    await wrapper.get('[data-testid="add-parameter-button"]').trigger('click')

    expect(backtestPane(wrapper).props('parameters')).toHaveLength(1)
  })

  it('載入另一支策略時告訴回測那一側工作區被換掉了', async () => {
    // 換了一份算式，上一次那次重演就與畫面上這一份無關了。
    const strategyApplication = buildStrategyApplication({
      listAvailableStrategies: vi.fn().mockResolvedValue({ mine: [buildStoredStrategy(7, '另一支', {
        scriptBody: '另一段算式',
        parameters: [new StrategyParameterDto('period', 'lookbackCount', 20)],
      })], adopted: [] }),
    })
    const wrapper = mountPanel(strategyApplication)
    await settle()

    const generationBefore = backtestPane(wrapper).props('workspaceGeneration')
    await wrapper.get('[data-testid="strategy-picker-select"]').setValue('7')
    await settle()

    expect(backtestPane(wrapper).props('workspaceGeneration'))
      .toBeGreaterThan(generationBefore as number)
  })
})
