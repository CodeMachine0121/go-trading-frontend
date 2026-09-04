import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import IndicatorCalculationPanel from '~/components/organisms/IndicatorCalculationPanel.vue'
import { IndicatorCalculationApplication } from '~/application/indicator-calculation-application'
import { IndicatorCalculationService } from '~/domain/service/indicator-calculation-service'
import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { StrategyParameterNotDeclaredError } from '~/domain/errors/strategy-parameter-not-declared-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'
import { buildStrategyApplication } from '../../fixtures/strategy-application'

const SCRIPT_BODY = 'return map[string]float64{"ma": 1}'

function buildProxy(
  calculateIndicator: IIndicatorCalculationProxy['calculateIndicator']
    = vi.fn().mockResolvedValue(new IndicatorCalculation(
      'BTCUSDT', '5m', 12, 'float', [new IndicatorValueVo('ma', [110])], [])),
): IIndicatorCalculationProxy {
  return { calculateIndicator }
}

function mountPanel(indicatorCalculationProxy: IIndicatorCalculationProxy) {
  return mount(IndicatorCalculationPanel, {
    props: {
      indicatorCalculationApplication: new IndicatorCalculationApplication(
        new IndicatorCalculationService(indicatorCalculationProxy)),
      strategyApplication: buildStrategyApplication(),
      tradingSymbolApplication: buildTradingSymbolApplication(),
    },
  })
}

async function typeScriptBody(wrapper: ReturnType<typeof mountPanel>, body: string) {
  wrapper.findComponent({ name: 'IndicatorScriptEditor' }).vm.$emit('update:modelValue', body)
  await wrapper.vm.$nextTick()
}

async function addParameter(wrapper: ReturnType<typeof mountPanel>, name: string, value: string) {
  await wrapper.get('[data-testid="add-parameter-button"]').trigger('click')
  const rows = wrapper.findAll('[data-testid="parameter-row"]')
  const row = rows[rows.length - 1]
  await row?.get('[data-testid="parameter-name-input"]').setValue(name)
  await row?.get('[data-testid="parameter-value-input"]').setValue(value)
}

describe('指標計算畫面上的參數', () => {
  it('一開始一個都沒有，而且明說', async () => {
    const wrapper = mountPanel(buildProxy())
    await flushPromises()

    expect(wrapper.findAll('[data-testid="parameter-row"]')).toHaveLength(0)
    expect(wrapper.find('[data-testid="parameters-empty"]').exists()).toBe(true)
  })

  it('新增出來的那一列名稱是空的、種類是回看根數、值是 20', async () => {
    const wrapper = mountPanel(buildProxy())
    await flushPromises()

    await wrapper.get('[data-testid="add-parameter-button"]').trigger('click')

    const row = wrapper.get('[data-testid="parameter-row"]')
    expect(row.get<HTMLInputElement>('[data-testid="parameter-name-input"]').element.value).toBe('')
    expect(row.get<HTMLSelectElement>('[data-testid="parameter-kind-select"]').element.value)
      .toBe('lookbackCount')
    expect(row.get<HTMLInputElement>('[data-testid="parameter-value-input"]').element.value)
      .toBe('20')
  })

  it('刪掉一列就只刪那一列', async () => {
    const wrapper = mountPanel(buildProxy())
    await flushPromises()
    await addParameter(wrapper, '快線', '20')
    await addParameter(wrapper, '慢線', '100')

    await wrapper.get('[data-testid="remove-parameter-0"]').trigger('click')

    const rows = wrapper.findAll('[data-testid="parameter-row"]')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.get<HTMLInputElement>('[data-testid="parameter-name-input"]').element.value)
      .toBe('慢線')
  })

  it('宣告的參數跟著這次計算送出去', async () => {
    const calculateIndicator = vi.fn().mockResolvedValue(new IndicatorCalculation(
      'BTCUSDT', '5m', 12, 'float', [new IndicatorValueVo('ma', [110])], []))
    const wrapper = mountPanel(buildProxy(calculateIndicator))
    await flushPromises()
    await typeScriptBody(wrapper, SCRIPT_BODY)
    await addParameter(wrapper, '期數', '50')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(calculateIndicator).toHaveBeenCalledWith(expect.objectContaining({
      parameters: expect.objectContaining({
        all: [expect.objectContaining({ name: '期數', kind: 'lookbackCount', value: 50 })],
      }),
    }))
  })

  it('名稱空白時就地說明，而且完全不執行', async () => {
    const calculateIndicator = vi.fn()
    const wrapper = mountPanel(buildProxy(calculateIndicator))
    await flushPromises()
    await typeScriptBody(wrapper, SCRIPT_BODY)
    await wrapper.get('[data-testid="add-parameter-button"]').trigger('click')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="parameters-alert"]').text()).toContain('不得為空白')
    expect(calculateIndicator).not.toHaveBeenCalled()
  })

  it('名稱重複時就地說明', async () => {
    const wrapper = mountPanel(buildProxy(vi.fn()))
    await flushPromises()
    await typeScriptBody(wrapper, SCRIPT_BODY)
    await addParameter(wrapper, '期數', '20')
    await addParameter(wrapper, '期數', '50')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="parameters-alert"]').text()).toContain('重複')
  })

  it('把一格從回看根數改成數值，小數就填得下去了', async () => {
    const calculateIndicator = vi.fn().mockResolvedValue(
      new IndicatorCalculation('BTCUSDT', '5m', 12, 'float', []))
    const wrapper = mountPanel(buildProxy(calculateIndicator))
    await flushPromises()
    await typeScriptBody(wrapper, SCRIPT_BODY)
    // 1.5 對回看根數是不合法的——K 線沒有半根這種東西。
    await addParameter(wrapper, '倍數', '1.5')

    await wrapper.get('[data-testid="parameter-kind-select"]').setValue('number')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="parameters-alert"]').exists()).toBe(false)
    expect(calculateIndicator).toHaveBeenCalledWith(expect.objectContaining({
      parameters: expect.objectContaining({
        all: [expect.objectContaining({ name: '倍數', kind: 'number', value: 1.5 })],
      }),
    }))
  })

  it.each([
    { cleared: '參數的值', selector: '[data-testid="parameter-value-input"]' },
    { cleared: '要看多長', selector: '[data-testid="span-amount-input"]' },
  ])('把$cleared 整格清空時，不當成填了零', async ({ selector }) => {
    // 清空是「還在打」的中間狀態。讀成 0 會讓使用者在打完之前就先看到一則錯誤，
    // 而 0 在回看根數那一種還是不合法的——他什麼都還沒做錯。
    const calculateIndicator = vi.fn().mockResolvedValue(
      new IndicatorCalculation('BTCUSDT', '5m', 12, 'float', []))
    const wrapper = mountPanel(buildProxy(calculateIndicator))
    await flushPromises()
    await typeScriptBody(wrapper, SCRIPT_BODY)
    await addParameter(wrapper, '期數', '20')

    await wrapper.get(selector).setValue('')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="parameters-alert"]').exists()).toBe(false)
    expect(calculateIndicator).toHaveBeenCalledWith(expect.objectContaining({
      parameters: expect.objectContaining({
        all: [expect.objectContaining({ name: '期數', value: 20 })],
      }),
    }))
  })

  it('回看根數不合法時就地說明', async () => {
    const wrapper = mountPanel(buildProxy(vi.fn()))
    await flushPromises()
    await typeScriptBody(wrapper, SCRIPT_BODY)
    await addParameter(wrapper, '期數', '0')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="parameters-alert"]').text()).toContain('大於零的整數')
  })
})

describe('名字對不上時，畫面不能說算式壞了', () => {
  it('說的是哪一個名字對不上，而且與算式那一則分開', async () => {
    const wrapper = mountPanel(buildProxy(vi.fn().mockRejectedValue(
      new StrategyParameterNotDeclaredError('期數', '算式取用了參數「期數」，但這一次沒有宣告這個名字'))))
    await flushPromises()
    await typeScriptBody(wrapper, SCRIPT_BODY)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const alert = wrapper.get('[data-testid="parameter-not-declared-alert"]')
    expect(alert.text()).toContain('期數')
    expect(wrapper.find('[data-testid="script-failed-alert"]').exists()).toBe(false)
  })

  it('算式真的跑不動時，說的仍然是算式的問題', async () => {
    const wrapper = mountPanel(buildProxy(vi.fn().mockRejectedValue(
      new IndicatorScriptFailedError('index out of range'))))
    await flushPromises()
    await typeScriptBody(wrapper, SCRIPT_BODY)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="parameter-not-declared-alert"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="script-failed-alert"]').text()).toContain('index out of range')
  })
})
