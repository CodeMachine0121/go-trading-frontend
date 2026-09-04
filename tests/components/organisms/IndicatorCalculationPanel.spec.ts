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
    calculateIndicator: vi.fn().mockResolvedValue(new IndicatorCalculation('BTCUSDT', '5m', 3, 'float', [])),
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
  values: {
    symbol?: string
    spanAmount?: string
    spanUnit?: string
    scriptBody?: string
    resultType?: string
  } = {},
) {
  // 先讓交易標的清單到齊，否則欄位一取回清單就會把不在清單上的那一檔改掉。
  await flushPromises()
  // 選單挑不出空值，但欄位的契約仍然是「交出什麼，這裡就用什麼」——
  // 直接讓欄位交出那個值，驗畫面確實照它處理。
  wrapper.findComponent(SymbolField).vm.$emit('update:modelValue', values.symbol ?? 'BTCUSDT')
  await wrapper.vm.$nextTick()
  // 使用者說的是「多長」，不是「幾根」——格數由那一段除以彙總刻度得出。
  if (values.spanAmount !== undefined) {
    await wrapper.get('[data-testid="span-amount-input"]').setValue(values.spanAmount)
  }
  if (values.spanUnit !== undefined) {
    await wrapper.get('[data-testid="span-unit-select"]').setValue(values.spanUnit)
  }
  if (values.resultType !== undefined) {
    await wrapper.get('[data-testid="result-type-select"]').setValue(values.resultType)
  }
  await typeScriptBody(wrapper, values.scriptBody ?? SCRIPT_BODY)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('IndicatorCalculationPanel', () => {
  it('只有一顆執行計算', () => {
    // 這一條是補的：把執行條件從側欄改成橫列時，欄位整組搬了過來——
    // 而那一組裡本來就有一顆送出鈕，於是畫面上同時站著兩顆。
    // 測試沒紅，因為兩顆共用同一個識別字，而取第一個相符的從來不會抱怨有第二個。
    const wrapper = mountPanel(buildProxy())

    expect(wrapper.findAll('[data-testid="calculate-button"]')).toHaveLength(1)
    expect(wrapper.findAll('button[type="submit"]')).toHaveLength(1)
  })

  it('算完之後，在採用根數旁邊說明只採用走完的那幾格', async () => {
    // 這句話曾經一進畫面就掛在執行條件底下。**改成跟著結果出現是刻意的**：
    // 使用者會問「為什麼是這個數字」的時刻，正是他看到「實際採用 24 根」
    // 卻要了 25 根的那一刻，不是他剛打開畫面、什麼都還沒算的時候。
    const wrapper = mountPanel(buildProxy())
    expect(wrapper.find('[data-testid="calculation-notice"]').exists()).toBe(false)

    await fillAndSubmit(wrapper)

    // 刻度變粗之後「排除最新一根」就講不清楚了：一小時的刻度下，
    // 不採用的是一整個還沒走完的小時。畫面說的必須是實際的規則。
    const notice = wrapper.get('[data-testid="calculation-notice"]')
    expect(notice.text()).toContain('已經走完')
    expect(notice.text()).not.toContain('排除最新一根')
  })

  it('算得出來時列出實際採用根數與依名稱排序的指標', async () => {
    const wrapper = mountPanel(buildProxy({
      calculateIndicator: vi.fn().mockResolvedValue(new IndicatorCalculation('BTCUSDT', '5m', 3, 'float', [
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
    // 「根數為零 / 為負 / 不是整數 / 留空」那四條在這裡消失了，因為**那一格已經不存在**：
    // 使用者說的是「要看多長」，格數由那一段除以彙總刻度得出，天生就是大於零的整數。
    // 這是刻意的行為變更，不是把驗證弄丟了。
    { description: '算式內容留空', values: { scriptBody: '' }, expectedMessage: '請填寫算式內容' },
  ])('$description 時標在欄位旁且完全不執行', async ({ values, expectedMessage }) => {
    const indicatorCalculationProxy = buildProxy()
    const wrapper = mountPanel(indicatorCalculationProxy)

    await fillAndSubmit(wrapper, values)

    expect(wrapper.get('[data-testid="field-error"]').text()).toBe(expectedMessage)
    expect(indicatorCalculationProxy.calculateIndicator).not.toHaveBeenCalled()
  })

  it('只看得下一格時照常執行', async () => {
    const indicatorCalculationProxy = buildProxy()
    const wrapper = mountPanel(indicatorCalculationProxy)

    // 五分鐘一段、五分鐘一根 → 一格。
    await fillAndSubmit(wrapper, { spanAmount: '5', spanUnit: 'minute' })

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
    // 最常見的原因是沙箱裡沒有那個名字，而訊息說得出少了什麼、說不出有什麼。
    await alert.get('[data-testid="script-failed-guide-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="script-parameter-access"]').length)
      .toBeGreaterThan(0)
    expect(wrapper.find('[data-testid="request-rejected-alert"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="indicator-row"]').exists()).toBe(false)
  })

  // 「超過單次上限」曾經也在這一排。它離開了，因為系統那一側現在會指名是哪一格，
  // 於是它落在「要看多長」旁邊而不是這裡——見 IndicatorCalculationPanelParameters 那一條。
  // 這一排剩下的是**指不出哪一格**的那些拒絕：它們只能如實轉達。
  it.each([
    { description: 'K 線不足', message: 'K 線不足，排除最新一根後目前可用 9 根，但要求 30 根' },
    { description: '這一段沒有資料', message: '這一段時間內沒有任何 K 線' },
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
        .mockResolvedValueOnce(new IndicatorCalculation('BTCUSDT', '5m', 3, 'float', [
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
        new IndicatorCalculation('BTCUSDT', '5m', 3, 'floatList', [
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
        new IndicatorCalculation('BTCUSDT', '5m', 3, 'boolList', [
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
        new IndicatorCalculation('BTCUSDT', '5m', 3, 'floatList', [
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
        new IndicatorCalculation('BTCUSDT', '5m', 3, 'bool', [
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

describe('指標計算畫面：算式裡可以用什麼', () => {
  // 這兩份清單曾經常駐在編輯區旁邊。**改成問了才出現是刻意的**：
  // 它們是「想不起來翻一下」，不是「一直看著」，而常駐要付的代價是
  // 跟編輯區——這個畫面上唯一需要空間的東西——搶同一塊寬度。
  async function openGuide(wrapper: Awaited<ReturnType<typeof mountPanel>>) {
    await wrapper.get('[data-testid="script-guide-button"]').trigger('click')
    await flushPromises()

    return wrapper
  }

  it('沒問的時候不佔畫面', async () => {
    const wrapper = await mountPanel(buildProxy())

    expect(wrapper.findAll('[data-testid="k-candle-field"]')).toHaveLength(0)
    expect(wrapper.findAll('[data-testid="script-parameter-access"]')).toHaveLength(0)
  })

  it('問了就列出算式收到的每一個欄位', async () => {
    const wrapper = await openGuide(await mountPanel(buildProxy()))

    const fieldNames = wrapper.findAll('[data-testid="k-candle-field"]').map(field => field.text())

    expect(fieldNames).toContain('Close')
    expect(fieldNames).toContain('TakerBuyQuoteVolume')
    expect(fieldNames).not.toContain('ID')
  })

  it('說出它是算式看得到的形狀，不是資料庫那張表', async () => {
    const wrapper = await openGuide(await mountPanel(buildProxy()))

    expect(wrapper.text()).toContain('不是資料庫那張表')
    expect(wrapper.text()).toContain('data []indicator.KCandle')
  })

  it('也說出宣告好的參數在算式裡怎麼讀，每一種各一則', async () => {
    // 讀法屬於沙箱契約，與 K 線欄位同一份——所以它們在同一個地方，
    // 而且都不是畫面自己寫的字。
    const wrapper = await openGuide(await mountPanel(buildProxy()))

    const calls = wrapper.findAll('[data-testid="script-parameter-access"]')
      .map(access => access.text())

    expect(calls).toHaveLength(3)
    expect(calls.some(call => call.includes('indicator.LookbackCount('))).toBe(true)
    expect(calls.some(call => call.includes('indicator.Number('))).toBe(true)
    expect(calls.some(call => call.includes('indicator.Boolean('))).toBe(true)
  })

  it('說出參數要怎麼設，以及名字對不上時會發生什麼', async () => {
    const wrapper = await openGuide(await mountPanel(buildProxy()))

    expect(wrapper.text()).toContain('新增參數')
    expect(wrapper.text()).toContain('同一個名字')
    expect(wrapper.text()).toContain('失敗並指名')
  })
})

describe('指標計算畫面：這次用了多粗', () => {
  it('挑好的彙總刻度真的被送出去', async () => {
    const calculateIndicator = vi.fn().mockResolvedValue(
      new IndicatorCalculation('BTCUSDT', '1h', 24, 'float', []))
    const wrapper = mountPanel(buildProxy({ calculateIndicator }))
    await settle()

    await wrapper.get('[data-testid="aggregation-interval-select"]').setValue('1h')
    await fillAndSubmit(wrapper)

    expect(calculateIndicator).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregationInterval: expect.objectContaining({ value: '1h' }),
      }))
  })

  it('什麼都沒挑時送出的是五分鐘', async () => {
    const calculateIndicator = vi.fn().mockResolvedValue(
      new IndicatorCalculation('BTCUSDT', '5m', 3, 'float', []))
    const wrapper = mountPanel(buildProxy({ calculateIndicator }))

    await fillAndSubmit(wrapper)

    expect(calculateIndicator).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregationInterval: expect.objectContaining({ value: '5m' }),
      }))
  })

  it('結果寫出這次實際採用的彙總刻度，與根數並列', async () => {
    const wrapper = mountPanel(buildProxy({
      calculateIndicator: vi.fn().mockResolvedValue(
        new IndicatorCalculation('BTCUSDT', '1h', 24, 'float', [])),
    }))

    await fillAndSubmit(wrapper)

    expect(wrapper.get('[data-testid="used-interval"]').text()).toContain('一小時')
    expect(wrapper.get('[data-testid="used-candle-count"]').text()).toContain('實際採用 24 根')
  })

  it('最細的那一種也照樣寫出來', async () => {
    const wrapper = mountPanel(buildProxy({
      calculateIndicator: vi.fn().mockResolvedValue(
        new IndicatorCalculation('BTCUSDT', '5m', 3, 'float', [])),
    }))

    await fillAndSubmit(wrapper)

    expect(wrapper.get('[data-testid="used-interval"]').text()).toContain('五分鐘')
  })

  it('寫的是後端回報的刻度，不是送出時挑的那一個', async () => {
    // 挑了一小時卻用五分鐘算出來的數字，長得跟對的一模一樣。
    // 照回報的呈現，這種錯才看得見。
    const wrapper = mountPanel(buildProxy({
      calculateIndicator: vi.fn().mockResolvedValue(
        new IndicatorCalculation('BTCUSDT', '5m', 3, 'float', [])),
    }))
    await settle()
    await wrapper.get('[data-testid="aggregation-interval-select"]').setValue('1h')

    await fillAndSubmit(wrapper)

    expect(wrapper.get('[data-testid="used-interval"]').text()).toContain('五分鐘')
  })

  it('一個指標都沒算出來時照樣寫得出這次用的刻度', async () => {
    const wrapper = mountPanel(buildProxy({
      calculateIndicator: vi.fn().mockResolvedValue(
        new IndicatorCalculation('BTCUSDT', '4h', 10, 'float', [])),
    }))

    await fillAndSubmit(wrapper)

    expect(wrapper.get('[data-testid="used-interval"]').text()).toContain('四小時')
  })

  it('計算失敗時完全不呈現結果，也就沒有刻度可說', async () => {
    const wrapper = mountPanel(buildProxy({
      calculateIndicator: vi.fn().mockRejectedValue(
        new IndicatorScriptFailedError('算式執行失敗')),
    }))

    await fillAndSubmit(wrapper)

    expect(wrapper.find('[data-testid="used-interval"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="used-candle-count"]').exists()).toBe(false)
  })
})
