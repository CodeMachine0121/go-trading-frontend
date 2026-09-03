import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import IndicatorCalculationPanel from '~/components/organisms/IndicatorCalculationPanel.vue'
import SymbolField from '~/components/molecules/SymbolField.vue'
import { IndicatorCalculationApplication } from '~/application/indicator-calculation-application'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'
import { buildStrategyApplication } from '../../fixtures/strategy-application'
import { IndicatorCalculationService } from '~/domain/service/indicator-calculation-service'
import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

// 只 mock 最外層的 proxy 介面；application、domain service 與 domain model 都是真的。
const SCRIPT_BODY = 'return map[string]float64{"均價": 110}'

function buildProxy(overrides: Partial<IIndicatorCalculationProxy> = {}): IIndicatorCalculationProxy {
  return {
    calculateIndicator: vi.fn().mockResolvedValue(new IndicatorCalculation('BTCUSDT', 3, 'float', [])),
    ...overrides,
  }
}

// 算式內容住在編輯區裡，而編輯區是掛載後才動態載入的，microtask 還輪不到它。
async function settle() {
  await new Promise(resolve => setTimeout(resolve, 20))
  await flushPromises()
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

/** 讀唯讀外框「寫了什麼」——不含行號欄。 */
function frameHeaderText(wrapper: ReturnType<typeof mountPanel>): string {
  return wrapper.get('[data-testid="script-frame-header"]').element
    .querySelector('.cm-content')?.textContent ?? ''
}

/** 讀算式內容區「寫了什麼」——不含行號欄。 */
function scriptBodyText(wrapper: ReturnType<typeof mountPanel>): string {
  return wrapper.get('[data-testid="script-body"]').element
    .querySelector('.cm-content')?.textContent ?? ''
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

async function fillAndSubmit(
  wrapper: ReturnType<typeof mountPanel>,
  values: { symbol?: string, candleCount?: string, scriptBody?: string, resultType?: string } = {},
) {
  // 先讓交易標的清單到齊，否則欄位一取回清單就會把不在清單上的那一檔改掉。
  await flushPromises()
  // 選單挑不出空值，但欄位的契約仍然是「交出什麼，這裡就用什麼」——
  // 直接讓欄位交出那個值，驗畫面確實照它處理。
  wrapper.findComponent(SymbolField).vm.$emit('update:modelValue', values.symbol ?? 'BTCUSDT')
  await wrapper.vm.$nextTick()
  await wrapper.get('[data-testid="candle-count-input"]').setValue(values.candleCount ?? '3')
  if (values.resultType !== undefined) {
    await wrapper.get('[data-testid="result-type-select"]').setValue(values.resultType)
  }
  await typeScriptBody(wrapper, values.scriptBody ?? SCRIPT_BODY)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('IndicatorCalculationPanel', () => {
  it('一進畫面就說明計算會排除最新一根', () => {
    const wrapper = mountPanel(buildProxy())

    expect(wrapper.get('[data-testid="calculation-notice"]').text()).toContain('排除最新一根')
  })

  it('算得出來時列出實際採用根數與依名稱排序的指標', async () => {
    const wrapper = mountPanel(buildProxy({
      calculateIndicator: vi.fn().mockResolvedValue(new IndicatorCalculation('BTCUSDT', 3, 'float', [
        new IndicatorValueVo('最高', [120]),
        new IndicatorValueVo('均價', [110]),
      ])),
    }))

    await fillAndSubmit(wrapper)

    expect(wrapper.get('[data-testid="used-candle-count"]').text()).toContain('實際採用 3 根')
    const rows = wrapper.findAll('[data-testid="indicator-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.text()).toContain('均價')
    expect(rows[0]?.text()).toContain('110')
    expect(rows[1]?.text()).toContain('最高')
  })

  it('一個指標都沒算出來時說明清楚，且不呈現為錯誤', async () => {
    const wrapper = mountPanel(buildProxy())

    await fillAndSubmit(wrapper)

    expect(wrapper.get('[data-testid="empty-result"]').text()).toContain('沒有算出任何指標')
    expect(wrapper.find('[data-testid="script-failed-alert"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="request-rejected-alert"]').exists()).toBe(false)
  })

  it.each([
    { description: '未指定交易標的', values: { symbol: '' }, expectedMessage: '請指定交易標的' },
    { description: '根數為零', values: { candleCount: '0' }, expectedMessage: '計算根數必須大於零' },
    { description: '根數為負', values: { candleCount: '-3' }, expectedMessage: '計算根數必須大於零' },
    { description: '根數不是整數', values: { candleCount: '2.5' }, expectedMessage: '計算根數必須是整數' },
    { description: '根數留空', values: { candleCount: '' }, expectedMessage: '請填寫計算根數' },
    { description: '算式內容留空', values: { scriptBody: '' }, expectedMessage: '請填寫算式內容' },
  ])('$description 時標在欄位旁且完全不執行', async ({ values, expectedMessage }) => {
    const indicatorCalculationProxy = buildProxy()
    const wrapper = mountPanel(indicatorCalculationProxy)

    await fillAndSubmit(wrapper, values)

    expect(wrapper.get('[data-testid="field-error"]').text()).toBe(expectedMessage)
    expect(indicatorCalculationProxy.calculateIndicator).not.toHaveBeenCalled()
  })

  it('根數為一時照常執行', async () => {
    const indicatorCalculationProxy = buildProxy()
    const wrapper = mountPanel(indicatorCalculationProxy)

    await fillAndSubmit(wrapper, { candleCount: '1' })

    expect(indicatorCalculationProxy.calculateIndicator).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="field-error"]').exists()).toBe(false)
  })

  it('算式跑不起來時，明確說是算式的問題', async () => {
    const wrapper = mountPanel(buildProxy({
      calculateIndicator: vi.fn().mockRejectedValue(
        new IndicatorScriptFailedError('算式必須提供 Calculate 進入點')),
    }))

    await fillAndSubmit(wrapper)

    const alert = wrapper.get('[data-testid="script-failed-alert"]')
    expect(alert.text()).toContain('要改的是算式')
    expect(alert.text()).toContain('算式必須提供 Calculate 進入點')
    expect(wrapper.find('[data-testid="request-rejected-alert"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="indicator-row"]').exists()).toBe(false)
  })

  it.each([
    { description: 'K 線不足', message: 'K 線不足，排除最新一根後目前可用 9 根，但要求 30 根' },
    { description: '超過單次上限', message: '超過單次可用的最大根數（最多 1000 根）' },
  ])('$description 時，說是請求的問題而不是算式的問題', async ({ message }) => {
    const wrapper = mountPanel(buildProxy({
      calculateIndicator: vi.fn().mockRejectedValue(new BackendRequestRejectedError(message)),
    }))

    await fillAndSubmit(wrapper)

    const alert = wrapper.get('[data-testid="request-rejected-alert"]')
    expect(alert.text()).toContain('請求的問題')
    expect(alert.text()).toContain(message)
    expect(wrapper.find('[data-testid="script-failed-alert"]').exists()).toBe(false)
  })

  it('後端自己出錯時，說清楚不是使用者的請求有問題並提供重試', async () => {
    const wrapper = mountPanel(buildProxy({
      calculateIndicator: vi.fn().mockRejectedValue(new BackendServerError('讀取 K 線失敗')),
    }))

    await fillAndSubmit(wrapper)

    const alert = wrapper.get('[data-testid="server-error-alert"]')
    expect(alert.text()).toContain('不是你的請求有問題')
    expect(alert.text()).toContain('讀取 K 線失敗')
    expect(alert.text()).toContain('重試')
    expect(wrapper.find('[data-testid="request-rejected-alert"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="script-failed-alert"]').exists()).toBe(false)
  })

  it('連不上後端時告知並提供重試', async () => {
    const wrapper = mountPanel(buildProxy({
      calculateIndicator: vi.fn().mockRejectedValue(new BackendUnreachableError('/indicator-calculations')),
    }))

    await fillAndSubmit(wrapper)

    expect(wrapper.get('[data-testid="unreachable-alert"]').text()).toContain('連不上後端')
  })

  it('未預期的錯誤也整塊告知', async () => {
    const wrapper = mountPanel(buildProxy({
      calculateIndicator: vi.fn().mockRejectedValue(new Error('boom')),
    }))

    await fillAndSubmit(wrapper)

    expect(wrapper.get('[data-testid="request-rejected-alert"]').text()).toContain('未預期的錯誤')
  })

  it('先前失敗的訊息在下一次成功計算後消失', async () => {
    const wrapper = mountPanel(buildProxy({
      calculateIndicator: vi.fn()
        .mockRejectedValueOnce(new IndicatorScriptFailedError('算式無法解讀'))
        .mockResolvedValueOnce(new IndicatorCalculation('BTCUSDT', 3, 'float', [
          new IndicatorValueVo('均價', [110]),
        ])),
    }))

    await fillAndSubmit(wrapper)
    expect(wrapper.find('[data-testid="script-failed-alert"]').exists()).toBe(true)

    await fillAndSubmit(wrapper)

    expect(wrapper.find('[data-testid="script-failed-alert"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="indicator-row"]')).toHaveLength(1)
  })

  it('計算進行中呈現狀態且執行按鈕不可再觸發', async () => {
    const pendingCalculation = new Promise<IndicatorCalculation>(() => {})
    const wrapper = mountPanel(buildProxy({
      calculateIndicator: vi.fn().mockReturnValue(pendingCalculation),
    }))

    await typeScriptBody(wrapper, SCRIPT_BODY)
    await wrapper.get('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-testid="calculating-alert"]').text()).toContain('計算中')
    expect(wrapper.get('[data-testid="calculate-button"]').attributes('disabled')).toBeDefined()
  })

  it('按下帶入範例內容會填入一段可直接執行的內容，而不是整段算式', async () => {
    const wrapper = mountPanel(buildProxy())
    await settle()

    await wrapper.get('[data-testid="example-button"]').trigger('click')
    await settle()

    const editorText = scriptBodyText(wrapper)
    expect(editorText).toContain('均價')
    expect(editorText).not.toContain('func Calculate')
    expect(editorText).not.toContain('package main')
  })

  it('指標值種類就是領域給的那四種', async () => {
    const wrapper = mountPanel(buildProxy())

    const options = wrapper.get('[data-testid="result-type-select"]').findAll('option')
    expect(options.map(option => option.text()))
      .toEqual(['一個數字', '一串數字', '一個是非', '一串是非'])
  })

  it.each([
    { resultType: 'float', valueShape: 'map[string]float64' },
    { resultType: 'floatList', valueShape: 'map[string][]float64' },
    { resultType: 'bool', valueShape: 'map[string]bool' },
    { resultType: 'boolList', valueShape: 'map[string][]bool' },
  ])('挑了 $resultType，外框就產出 $valueShape', async ({ resultType, valueShape }) => {
    const wrapper = mountPanel(buildProxy())
    await settle()

    await wrapper.get('[data-testid="result-type-select"]').setValue(resultType)
    await settle()

    expect(frameHeaderText(wrapper)).toContain(valueShape)
  })

  it('切換種類不會弄丟已經寫好的內容', async () => {
    const wrapper = mountPanel(buildProxy())
    await typeScriptBody(wrapper, 'sum := 0.0')

    await wrapper.get('[data-testid="result-type-select"]').setValue('boolList')
    await settle()

    expect(frameHeaderText(wrapper)).toContain('map[string][]bool')
    expect(scriptBodyText(wrapper)).toContain('sum := 0.0')
  })

  it('沒有特別挑時送出的是一個數字', async () => {
    const indicatorCalculationProxy = buildProxy()
    const wrapper = mountPanel(indicatorCalculationProxy)

    await fillAndSubmit(wrapper)

    expect(indicatorCalculationProxy.calculateIndicator).toHaveBeenCalledWith(
      expect.objectContaining({ resultType: expect.objectContaining({ value: 'float' }) }))
  })

  it('挑了哪一種就送哪一種，且送出的是外框加內容', async () => {
    const indicatorCalculationProxy = buildProxy()
    const wrapper = mountPanel(indicatorCalculationProxy)

    await fillAndSubmit(wrapper, { resultType: 'boolList', scriptBody: 'return nil' })

    expect(indicatorCalculationProxy.calculateIndicator).toHaveBeenCalledWith(
      expect.objectContaining({
        resultType: expect.objectContaining({ value: 'boolList' }),
        script: expect.stringContaining('map[string][]bool'),
      }))
  })

  it('帶入的範例內容跟著當下挑的種類走', async () => {
    const wrapper = mountPanel(buildProxy())
    await settle()

    await wrapper.get('[data-testid="result-type-select"]').setValue('boolList')
    await wrapper.get('[data-testid="example-button"]').trigger('click')
    await settle()

    expect(scriptBodyText(wrapper)).toContain('map[string][]bool{')
  })

  it('一串數字的每個值都看得到，順序不變', async () => {
    const wrapper = mountPanel(buildProxy({
      calculateIndicator: vi.fn().mockResolvedValue(
        new IndicatorCalculation('BTCUSDT', 3, 'floatList', [
          new IndicatorValueVo('均線', [100, 105, 110]),
        ])),
    }))

    await fillAndSubmit(wrapper, { resultType: 'floatList' })

    expect(wrapper.findAll('[data-testid="series-item"]').map(item => item.text()))
      .toEqual(['100', '105', '110'])
  })

  it('是非顯示「是」與「否」', async () => {
    const wrapper = mountPanel(buildProxy({
      calculateIndicator: vi.fn().mockResolvedValue(
        new IndicatorCalculation('BTCUSDT', 3, 'boolList', [
          new IndicatorValueVo('逐根收紅', [true, false, true]),
        ])),
    }))

    await fillAndSubmit(wrapper, { resultType: 'boolList' })

    expect(wrapper.findAll('[data-testid="series-item"]').map(item => item.text()))
      .toEqual(['是', '否', '是'])
  })

  it('空的一串明說是空的，不是留一片空白', async () => {
    const wrapper = mountPanel(buildProxy({
      calculateIndicator: vi.fn().mockResolvedValue(
        new IndicatorCalculation('BTCUSDT', 3, 'floatList', [
          new IndicatorValueVo('均線', []),
        ])),
    }))

    await fillAndSubmit(wrapper, { resultType: 'floatList' })

    expect(wrapper.get('[data-testid="empty-series"]').text()).toBe('空的一串')
    expect(wrapper.find('[data-testid="empty-result"]').exists()).toBe(false)
  })

  it('結果說明這次的指標值種類', async () => {
    const wrapper = mountPanel(buildProxy({
      calculateIndicator: vi.fn().mockResolvedValue(
        new IndicatorCalculation('BTCUSDT', 3, 'bool', [
          new IndicatorValueVo('黃金交叉', [true]),
        ])),
    }))

    await fillAndSubmit(wrapper, { resultType: 'bool' })

    expect(wrapper.get('[data-testid="used-candle-count"]').text()).toContain('一個是非')
    expect(wrapper.get('[data-testid="indicator-row"]').text()).toContain('是')
  })

  it('算式內容寫得根本不成立時，畫面照樣送出——判定是後端的事', async () => {
    const indicatorCalculationProxy = buildProxy()
    const wrapper = mountPanel(indicatorCalculationProxy)

    await fillAndSubmit(wrapper, { scriptBody: '這根本不是一段程式 {{{' })

    expect(indicatorCalculationProxy.calculateIndicator).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="field-error"]').exists()).toBe(false)
  })
})
