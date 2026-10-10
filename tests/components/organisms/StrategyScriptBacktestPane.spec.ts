import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import StrategyScriptBacktestPane from '~/components/organisms/StrategyScriptBacktestPane.vue'
import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import type { IBacktestRunProxy } from '~/domain/interface/i-backtest-run-proxy'
import { BacktestApplication } from '~/application/backtest-application'
import { BacktestService } from '~/domain/service/backtest-service'
import { AggregationIntervalDomain } from '~/domain/models/domains/aggregation-interval-domain'
import type { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'
import { StrategyScriptParameterNotDeclaredError } from '~/domain/errors/strategy-script-parameter-not-declared-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { BacktestRunOwnerLimitError } from '~/domain/errors/backtest-run-owner-limit-error'
import type { BacktestRun } from '~/domain/models/entities/backtest-run'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'
import { buildTimeZone } from '../../fixtures/time-zone'
import { buildBacktestRun, buildBacktestRunProxy } from '../../fixtures/backtest-run'

// 繪圖函式庫是最外層的邊界：它需要真正的畫布，而這裡要驗的不是它畫得對不對。
const chartLibrary = vi.hoisted(() => {
  const lineSeries = { setData: vi.fn(), applyOptions: vi.fn() }

  return {
    lineSeries,
    createChart: vi.fn(() => ({
      addSeries: vi.fn(() => lineSeries),
      applyOptions: vi.fn(),
      timeScale: vi.fn(() => ({ fitContent: vi.fn() })),
      remove: vi.fn(),
    })),
  }
})

vi.mock('lightweight-charts', () => ({
  createChart: chartLibrary.createChart,
  LineSeries: 'LineSeries',
}))

const WHOLE_SCRIPT = 'return indicator.Buy'

function buildProxy(overrides: Partial<IBacktestProxy> = {}): IBacktestProxy {
  return {
    submitBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
    submitTradingStrategyBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
    submitContractBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
    submitContractTradingStrategyBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
    ...overrides,
  }
}

function mountPane(
  proxy: IBacktestProxy, props: Record<string, unknown> = {}, runProxy: IBacktestRunProxy = buildBacktestRunProxy(),
) {
  return mount(StrategyScriptBacktestPane, {
    props: {
      backtestApplication: new BacktestApplication(new BacktestService(proxy, runProxy)),
      tradingSymbolApplication: buildTradingSymbolApplication(),
      timeZone: buildTimeZone(),
      aggregationIntervalOptions: [new AggregationIntervalDomain('1h').toOptionDto()],
      script: WHOLE_SCRIPT,
      resultType: 'signal',
      parameters: [] as StrategyScriptParameterDto[],
      workspaceGeneration: 0,
      symbol: 'BTCUSDT',
      aggregationInterval: '1h',
      ...props,
    },
  })
}

async function submitBacktest(wrapper: ReturnType<typeof mountPane>) {
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('StrategyScriptBacktestPane', () => {
  describe('一打開就有的那幾格', () => {
    it('時間區間已經填好，直接按得下去', async () => {
      const proxy = buildProxy()
      const wrapper = mountPane(proxy)

      await submitBacktest(wrapper)

      expect(proxy.submitBacktest).toHaveBeenCalled()
    })

    it('本金已經填好一個大於零的數', () => {
      const wrapper = mountPane(buildProxy())

      const filled = wrapper.get('[data-testid="backtest-initial-capital-input"]')
        .element as HTMLInputElement
      expect(Number(filled.value)).toBeGreaterThan(0)
    })

    it('說明寫著送出後在背後計算、去哪裡看，沒有請等待', () => {
      const wrapper = mountPane(buildProxy())

      const placeholder = wrapper.get('[data-testid="backtest-placeholder"]').text()
      expect(placeholder).toContain('送出後會在背後計算，可在下方列表或回測紀錄頁查看')
      expect(wrapper.text()).not.toContain('請等待')
    })

    it('下方列表只列這一支腳本的輪次', async () => {
      const runProxy = buildBacktestRunProxy()
      mountPane(buildProxy(), { strategyScriptId: 9 }, runProxy)
      await flushPromises()

      const [queryDomain, inBackground] = vi.mocked(runProxy.listRuns).mock.calls[0]!
      expect(queryDomain.strategyScriptId).toBe(9)
      expect(queryDomain.tradingStrategyId).toBeNull()
      expect(inBackground).toBe(false)
    })

    it('預設押注方式旁邊沒有那一格', () => {
      const wrapper = mountPane(buildProxy())

      expect(wrapper.find('[data-testid="backtest-position-sizing-value-input"]').exists())
        .toBe(false)
    })
  })

  describe('押注方式決定旁邊那一格', () => {
    it('選了百分比就出現一格', async () => {
      const wrapper = mountPane(buildProxy())

      await wrapper.get('[data-testid="backtest-position-sizing-mode-select"]')
        .setValue('percentage')

      expect(wrapper.find('[data-testid="backtest-position-sizing-value-input"]').exists())
        .toBe(true)
    })

    it('選了固定金額也出現一格', async () => {
      const wrapper = mountPane(buildProxy())

      await wrapper.get('[data-testid="backtest-position-sizing-mode-select"]')
        .setValue('fixedAmount')

      expect(wrapper.find('[data-testid="backtest-position-sizing-value-input"]').exists())
        .toBe(true)
    })

    it('切去全押再切回來，填過的數字還在', async () => {
      // 他本來就沒有改過它。
      const wrapper = mountPane(buildProxy())
      const modeSelect = wrapper.get('[data-testid="backtest-position-sizing-mode-select"]')

      await modeSelect.setValue('percentage')
      await wrapper.get('[data-testid="backtest-position-sizing-value-input"]').setValue('37')
      await modeSelect.setValue('allIn')
      await modeSelect.setValue('percentage')

      const restored = wrapper.get('[data-testid="backtest-position-sizing-value-input"]')
        .element as HTMLInputElement
      expect(restored.value).toBe('37')
    })
  })

  describe('不合法就不送出，說明留在那一格旁邊', () => {
    it('起點晚於終點時說在時間那一格，而且一次都沒打出去', async () => {
      const proxy = buildProxy()
      const wrapper = mountPane(proxy)

      await wrapper.get('[data-testid="backtest-start-time-input"]').setValue('2026-09-10T00:00')
      await wrapper.get('[data-testid="backtest-end-time-input"]').setValue('2026-09-01T00:00')
      await submitBacktest(wrapper)

      expect(proxy.submitBacktest).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('起點不能晚於終點')
      expect(wrapper.findAll('[data-testid="backtest-run-row"]')).toHaveLength(0)
    })

    it('本金留白時說在本金那一格', async () => {
      const proxy = buildProxy()
      const wrapper = mountPane(proxy)

      await wrapper.get('[data-testid="backtest-initial-capital-input"]').setValue('')
      await submitBacktest(wrapper)

      expect(proxy.submitBacktest).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('請填一個大於零的數')
    })

    it('本金填零時同樣不送出', async () => {
      const proxy = buildProxy()
      const wrapper = mountPane(proxy)

      await wrapper.get('[data-testid="backtest-initial-capital-input"]').setValue('0')
      await submitBacktest(wrapper)

      expect(proxy.submitBacktest).not.toHaveBeenCalled()
    })

    it('百分比填零時說在那一格', async () => {
      const proxy = buildProxy()
      const wrapper = mountPane(proxy)

      await wrapper.get('[data-testid="backtest-position-sizing-mode-select"]')
        .setValue('percentage')
      await wrapper.get('[data-testid="backtest-position-sizing-value-input"]').setValue('0')
      await submitBacktest(wrapper)

      expect(proxy.submitBacktest).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('百分比要大於零且不超過一百')
    })

    it('算式宣告的不是「一個信號」時當場說清楚，而不是硬送出去', async () => {
      // 使用者什麼都沒改，卻收到一句直譯器的型別抱怨——那句話不會告訴他該按哪個下拉選單。
      const proxy = buildProxy()
      const wrapper = mountPane(proxy, { resultType: 'floatList' })

      await submitBacktest(wrapper)

      expect(proxy.submitBacktest).not.toHaveBeenCalled()
      const message = wrapper.get('[data-testid="backtest-script-error"]').text()
      expect(message).toContain('一個信號')
      expect(message).toContain('一串數字')
    })

    it('算式空白時說在算式那裡——與指標預覽同一條規則', async () => {
      const proxy = buildProxy()
      const wrapper = mountPane(proxy, { script: '   ' })

      await submitBacktest(wrapper)

      expect(proxy.submitBacktest).not.toHaveBeenCalled()
      expect(wrapper.get('[data-testid="backtest-script-error"]').text())
        .toContain('請填寫算式內容')
    })
  })

  describe('按下去之後的每一種狀態', () => {
    it('送出去的時候執行鍵停用，收下之後說出輪次編號、鍵又按得下去', async () => {
      // 避免他以為沒反應而按第二次；收下之後成績單不在這裡，在列表裡。
      let finishRun: (run: BacktestRun) => void = () => {}
      const wrapper = mountPane(buildProxy({
        submitBacktest: vi.fn(() => new Promise<BacktestRun>((resolve) => {
          finishRun = resolve
        })),
      }))

      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(wrapper.get('[data-testid="run-backtest-button"]').text()).toBe('回測中…')
      expect(wrapper.get('[data-testid="run-backtest-button"]').attributes('disabled'))
        .toBeDefined()

      finishRun(buildBacktestRun({ id: 40 }))
      await flushPromises()

      expect(wrapper.get('[data-testid="backtest-submitted-alert"]').text()).toContain('已送出，輪次 #40')
      expect(wrapper.get('[data-testid="run-backtest-button"]').text()).toBe('執行回測')
      expect(wrapper.get('[data-testid="run-backtest-button"]').attributes('disabled'))
        .toBeUndefined()
    })

    it('剛送出的那一筆立刻出現在下方的列表最上面', async () => {
      const wrapper = mountPane(buildProxy({
        submitBacktest: vi.fn().mockResolvedValue(buildBacktestRun({ id: 40 })),
      }))

      await submitBacktest(wrapper)

      const rows = wrapper.findAll('[data-testid="backtest-run-row"]')
      expect(rows).toHaveLength(1)
      expect(rows[0]!.text()).toContain('#40')
      expect(rows[0]!.get('[data-testid="backtest-run-status"]').text()).toBe('排隊中')
    })

    it('同時太多筆時說出上限，列表不變', async () => {
      const wrapper = mountPane(buildProxy({
        submitBacktest: vi.fn().mockRejectedValue(new BacktestRunOwnerLimitError(3)),
      }))

      await submitBacktest(wrapper)

      expect(wrapper.get('[data-testid="backtest-owner-limit-alert"]').text())
        .toBe('你同時最多 3 筆，等其中一筆結束再送')
      expect(wrapper.findAll('[data-testid="backtest-run-row"]')).toHaveLength(0)
    })

    it('後端連不上時執行鍵停用——按了也沒用', async () => {
      const wrapper = mountPane(buildProxy({
        submitBacktest: vi.fn().mockRejectedValue(new BackendUnreachableError('連不上')),
      }))

      await submitBacktest(wrapper)

      expect(wrapper.find('[data-testid="backtest-unreachable-alert"]').exists()).toBe(true)
      expect(wrapper.get('[data-testid="run-backtest-button"]').attributes('disabled'))
        .toBeDefined()
    })

    it('算式出錯時說成算式的問題', async () => {
      const wrapper = mountPane(buildProxy({
        submitBacktest: vi.fn().mockRejectedValue(new IndicatorScriptFailedError('算式執行失敗')),
      }))

      await submitBacktest(wrapper)

      expect(wrapper.get('[data-testid="backtest-script-failed-alert"]').text())
        .toContain('算式執行失敗')
    })

    it('名字對不上時說成參數的問題，不是算式壞了', async () => {
      const wrapper = mountPane(buildProxy({
        submitBacktest: vi.fn().mockRejectedValue(
          new StrategyScriptParameterNotDeclaredError('期數', '算式取用了參數 "期數"')),
      }))

      await submitBacktest(wrapper)

      expect(wrapper.get('[data-testid="backtest-parameter-not-declared-alert"]').text())
        .toContain('期數')
      expect(wrapper.find('[data-testid="backtest-script-failed-alert"]').exists()).toBe(false)
    })

    it('後端自己壞掉時說清楚不是使用者的請求有問題', async () => {
      const wrapper = mountPane(buildProxy({
        submitBacktest: vi.fn().mockRejectedValue(new BackendServerError('內部錯誤')),
      }))

      await submitBacktest(wrapper)

      expect(wrapper.get('[data-testid="backtest-server-error-alert"]').text())
        .toContain('不是你的請求有問題')
    })

    it('這一次的錯誤不會被上一次「已送出」那一句蓋住', async () => {
      const submitBacktestMock = vi.fn()
        .mockResolvedValueOnce(buildBacktestRun())
        .mockRejectedValueOnce(new BackendRequestRejectedError('這一段重演不了'))
      const wrapper = mountPane(buildProxy({ submitBacktest: submitBacktestMock }))

      await submitBacktest(wrapper)
      expect(wrapper.find('[data-testid="backtest-submitted-alert"]').exists()).toBe(true)

      await submitBacktest(wrapper)

      expect(wrapper.find('[data-testid="backtest-submitted-alert"]').exists()).toBe(false)
      expect(wrapper.get('[data-testid="backtest-request-rejected-alert"]').text())
        .toContain('這一段重演不了')
    })

    it('換了一份工作區就把上一次「已送出」那一句清掉', async () => {
      // 換了一份算式，上一次送出的那一筆與畫面上這一份已經無關了。
      const wrapper = mountPane(buildProxy())

      await submitBacktest(wrapper)
      expect(wrapper.find('[data-testid="backtest-submitted-alert"]').exists()).toBe(true)

      await wrapper.setProps({ workspaceGeneration: 1 })
      await flushPromises()

      expect(wrapper.find('[data-testid="backtest-submitted-alert"]').exists()).toBe(false)
    })
  })

  describe('回測照什麼規則走', () => {
    it('那份規則一開始是收著的', () => {
      // 使用者九成的時間並不在讀它，攤在版面上只會跟真正要看的東西搶寬度。
      const wrapper = mountPane(buildProxy())

      expect(wrapper.text()).not.toContain('回測照什麼規則走的說明')
      expect(wrapper.findAll('[data-testid="backtest-rule-title"]')).toHaveLength(0)
    })

    it('按下那顆鍵就把規則攤開來', async () => {
      const wrapper = mountPane(buildProxy())

      await wrapper.get('[data-testid="backtest-rule-guide-button"]').trigger('click')

      expect(wrapper.findAll('[data-testid="backtest-rule-title"]').length)
        .toBeGreaterThan(0)
    })

    it('說得出信號種類的算式能回傳哪三個值', async () => {
      const wrapper = mountPane(buildProxy())

      await wrapper.get('[data-testid="backtest-rule-guide-button"]').trigger('click')

      const readings = wrapper.findAll('[data-testid="signal-reading-row"]')
        .map(row => row.text())
      expect(readings.some(text => text.includes('indicator.Buy') && text.includes('買入'))).toBe(true)
      expect(readings.some(text => text.includes('indicator.Sell') && text.includes('賣出'))).toBe(true)
      expect(readings.some(text => text.includes('indicator.Hold') && text.includes('持有'))).toBe(true)
      // 過時的「看正負號」讀法不該再出現。
      expect(readings.some(text => text.includes('大於 0'))).toBe(false)
    })

    it('規則講的是信號種類，不是「多放一個叫 signal 的名稱、看正負號」', async () => {
      const wrapper = mountPane(buildProxy())

      await wrapper.get('[data-testid="backtest-rule-guide-button"]').trigger('click')

      const titles = wrapper.findAll('[data-testid="backtest-rule-title"]').map(node => node.text())
      expect(titles).toContain('只跑「一個信號」的算式')
      const text = wrapper.text()
      expect(text).toContain('指標值種類選「一個信號」')
      expect(text).not.toContain('看正負號')
    })

    it('明講這一版不算手續費——不然那張成績單會被當成真的', async () => {
      const wrapper = mountPane(buildProxy())

      await wrapper.get('[data-testid="backtest-rule-guide-button"]').trigger('click')

      expect(wrapper.text()).toContain('手續費')
    })
  })

  describe('市場與彙總刻度是共用的那一份', () => {
    it('在回測改市場時往上說一聲，而不是自己留著', async () => {
      const wrapper = mountPane(buildProxy())
      // 可挑的標的是掛載後才取回來的，取回來之前那一格是停用的。
      await flushPromises()

      await wrapper.get('[data-testid="symbol-select"]').setValue('ETHUSDT')

      expect(wrapper.emitted('update:symbol')?.at(-1)).toEqual(['ETHUSDT'])
    })
  })
})

// 這一格上一次來的時候是四顆並排的按鈕。整組拿掉而不交代，使用者會以為畫面壞了、
// 或是自己記錯了——所以位置與標題留著，改說一句話。
//
// 那句話是這一刀對使用者唯一可見的新東西，而它是散文：沒有型別擋得住它被改成
// 一句沒有內容的話，所以每一件它必須說的事都在這裡被釘住。
describe('StrategyScriptBacktestPane 這一次照什麼規矩操作', () => {
  it('挑不動了，但那個位置說得出現在是哪一種', async () => {
    const wrapper = mountPane(buildProxy())

    // 挑得動的那四顆按鈕不在了——留著任何一顆，使用者都會挑一個必定被拒絕的值。
    expect(wrapper.find('[data-testid="backtest-trading-mode-longShort-radio"]').exists())
      .toBe(false)
    expect(wrapper.find('[data-testid="backtest-trading-mode-spot-radio"]').exists())
      .toBe(false)
    // 而那一格本身還在，說著現在是哪一種。
    expect(wrapper.get('[data-testid="backtest-trading-mode-note"]').text())
      .toContain('只做現貨')
  })

  it('那句話說得出倉位怎麼走', async () => {
    // 三件事都要說：買入開倉、賣出回現金、空手時賣出什麼都不做。
    // 第三件是唯一一件使用者猜不到的——他的算式一路喊賣出，而他手上什麼都沒有。
    const note = mountPane(buildProxy())
      .get('[data-testid="backtest-trading-mode-note"]').text()

    expect(note).toContain('空手就開倉')
    expect(note).toContain('平倉把錢收回來')
    expect(note).toContain('空手時聽到賣出什麼都不做')
  })

  it('那句話說得出這裡做不到什麼', async () => {
    // 少了這一句，一個想放空或上槓桿的人會以為是自己沒找到那一格。
    const note = mountPane(buildProxy())
      .get('[data-testid="backtest-trading-mode-note"]').text()

    expect(note).toContain('借錢與做空是合約帳戶的事')
  })

  it('那一組借多少的格子整組不在了', async () => {
    const wrapper = mountPane(buildProxy())

    expect(wrapper.find('[data-testid="backtest-leverage-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="backtest-maintenance-margin-rate-input"]').exists())
      .toBe(false)
  })

  it('送出去的請求裡沒有那三個欄位', async () => {
    // 畫面上看不到不等於送出去沒有：表單模型、DTO 與 proxy 少改一層，
    // 欄位就會以預設值上線，而後端會整份拒絕——使用者看到的是一句
    // 與他剛做的事對不起來的話。
    const proxy = buildProxy()
    const wrapper = mountPane(proxy)

    await submitBacktest(wrapper)

    const request = vi.mocked(proxy.submitBacktest).mock.calls[0]![0]
    expect(request).not.toHaveProperty('tradingMode')
    expect(request).not.toHaveProperty('leverage')
    expect(request).not.toHaveProperty('maintenanceMarginRate')
    // 還在的那幾格照樣送得出去，所以這不是因為請求空了才過的。
    expect(request.initialCapital.toString()).toBe('10000')
  })
})

describe('StrategyScriptBacktestPane 這一次要不要模擬出場', () => {
  it('兩個出場距離填了就送出去', async () => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy)

    await wrapper.get('[data-testid="backtest-stop-loss-percentage-input"]').setValue('2')
    await wrapper.get('[data-testid="backtest-take-profit-percentage-input"]').setValue('5')
    await submitBacktest(wrapper)

    const request = vi.mocked(proxy.submitBacktest).mock.calls[0]![0]
    expect(request.stopLossPercentage.toString()).toBe('2')
    expect(request.takeProfitPercentage.toString()).toBe('5')
  })

  it('預設兩格都留白，而留白就是不模擬', async () => {
    // 這一刀之前的每一次重演都沒有停損，替它們補一個就是在沒有人動手的
    // 情況下改掉使用者手上每一張成績單。
    const proxy = buildProxy()
    const wrapper = mountPane(proxy)

    expect(wrapper.get<HTMLInputElement>(
      '[data-testid="backtest-stop-loss-percentage-input"]').element.value).toBe('')

    await submitBacktest(wrapper)

    const request = vi.mocked(proxy.submitBacktest).mock.calls[0]![0]
    expect(request.stopLossPercentage.isZero()).toBe(true)
    expect(request.takeProfitPercentage.isZero()).toBe(true)
  })

  it('距離填錯就**不送出**，而那句話留在那一組旁邊', async () => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy)

    await wrapper.get('[data-testid="backtest-stop-loss-percentage-input"]').setValue('-2')
    await submitBacktest(wrapper)

    expect(proxy.submitBacktest).not.toHaveBeenCalled()
    // 位置就是這一條的全部重點：一則標在頁面頂端的訊息，指不出下一步。
    const exitLevelsField = wrapper.get('.backtest-condition-fields__exit-levels')
    expect(exitLevelsField.get('[data-testid="field-error"]').text())
      .toContain('止損距離不得為負')
  })

  it('那句拒絕與機器人表單上那兩格逐字相同', async () => {
    // 兩張表單問同一件事，而同一個 150 不該有兩種說法。
    // 這一條釘的就是那份共用模型的措詞。
    const wrapper = mountPane(buildProxy())

    await wrapper.get('[data-testid="backtest-stop-loss-percentage-input"]').setValue('120')
    await submitBacktest(wrapper)

    expect(wrapper.get('.backtest-condition-fields__exit-levels')
      .get('[data-testid="field-error"]').text())
      .toBe('止損距離不得超過 100%——那會讓價格變成負數')
  })

  it('正好 100 送得出去——止損價正好是零，荒謬但算得出來', async () => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy)

    await wrapper.get('[data-testid="backtest-stop-loss-percentage-input"]').setValue('100')
    await submitBacktest(wrapper)

    expect(proxy.submitBacktest).toHaveBeenCalled()
  })
})

describe('StrategyScriptBacktestPane 這一次交易要付多少', () => {
  it('兩個費率填了就送出去', async () => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy)

    await wrapper.get('[data-testid="backtest-entry-cost-percentage-input"]')
      .setValue('0.0855')
    await wrapper.get('[data-testid="backtest-exit-cost-percentage-input"]')
      .setValue('0.3855')
    await submitBacktest(wrapper)

    const request = vi.mocked(proxy.submitBacktest).mock.calls[0]![0]
    expect(request.entryCostPercentage.toString()).toBe('0.0855')
    expect(request.exitCostPercentage.toString()).toBe('0.3855')
  })

  it('預設兩格都留白，而留白就是不收費', async () => {
    // 替既有的每一次重演補一個「常見費率」，就是在沒有人動手的情況下
    // 改掉使用者手上每一張成績單。
    const proxy = buildProxy()
    const wrapper = mountPane(proxy)

    expect(wrapper.get<HTMLInputElement>(
      '[data-testid="backtest-entry-cost-percentage-input"]').element.value).toBe('')

    await submitBacktest(wrapper)

    const request = vi.mocked(proxy.submitBacktest).mock.calls[0]![0]
    expect(request.entryCostPercentage.isZero()).toBe(true)
    expect(request.exitCostPercentage.isZero()).toBe(true)
  })

  it('費率填錯就**不送出**，而那句話留在那一組旁邊', async () => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy)

    await wrapper.get('[data-testid="backtest-entry-cost-percentage-input"]').setValue('-1')
    await submitBacktest(wrapper)

    expect(proxy.submitBacktest).not.toHaveBeenCalled()
    // 位置就是這一條的全部重點：訊息要落在他要去改的那一組旁邊。
    expect(wrapper.get('.backtest-condition-fields__transaction-costs')
      .get('[data-testid="field-error"]').text())
      .toContain('進場成本率不得為負')
  })

  it('超過一百的理由講的是成本，不是隔壁那組的價格', async () => {
    // 兩組就擺在一起，而規則不同。拿到隔壁那句話的人會去看錯的地方。
    const wrapper = mountPane(buildProxy())

    await wrapper.get('[data-testid="backtest-exit-cost-percentage-input"]').setValue('101')
    await submitBacktest(wrapper)

    expect(wrapper.get('.backtest-condition-fields__transaction-costs')
      .get('[data-testid="field-error"]').text())
      .toBe('出場成本率不得超過 100%——成本不會超過成交金額本身')
  })

  it('那一組旁邊說得出「出場留白時跟進場一樣」', async () => {
    // 隔壁那兩格各自獨立、各自留白即不模擬；這一組不是。
    // 不說出來，使用者會把隔壁那一組的規則帶過來。
    const wrapper = mountPane(buildProxy())

    expect(wrapper.get('.backtest-condition-fields__transaction-costs').text())
      .toContain('出場留白時跟進場一樣')
  })

  it('正好 100 送得出去', async () => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy)

    await wrapper.get('[data-testid="backtest-entry-cost-percentage-input"]').setValue('100')
    await submitBacktest(wrapper)

    expect(proxy.submitBacktest).toHaveBeenCalled()
  })
})

describe('StrategyScriptBacktestPane 指名一支我加入的策略腳本', () => {
  it('收到策略腳本的識別碼時，回測指名它本身、不帶算式', async () => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy, { script: '', strategyScriptId: 9 })

    await submitBacktest(wrapper)

    const sent = vi.mocked(proxy.submitBacktest).mock.calls[0]![0]
    expect(sent.strategyScriptId).toBe(9)
    expect(sent.script).toBe('')
  })
})

describe('StrategyScriptBacktestPane 切成英文', () => {
  async function inEnglish(wrapper: ReturnType<typeof mountPane>) {
    wrapper.vm.$i18n.locale = 'en'
    await nextTick()
  }

  it('條件那一塊、執行鍵與還沒跑過時那一句都說英文', async () => {
    const wrapper = mountPane(buildProxy())

    await inEnglish(wrapper)

    expect(wrapper.text()).toContain('Backtest conditions')
    expect(wrapper.text()).toContain('Initial capital')
    expect(wrapper.text()).toContain('Stop-loss distance (%)')
    expect(wrapper.get('[data-testid="run-backtest-button"]').text()).toBe('Run backtest')
    expect(wrapper.get('[data-testid="backtest-placeholder"]').text())
      .toContain('computed in the background')
  })

  it('已經標在那一組旁邊的拒絕，換語言時跟著換', async () => {
    const wrapper = mountPane(buildProxy())

    await wrapper.get('[data-testid="backtest-stop-loss-percentage-input"]').setValue('-2')
    await submitBacktest(wrapper)
    await inEnglish(wrapper)

    expect(wrapper.get('.backtest-condition-fields__exit-levels [data-testid="field-error"]').text())
      .toBe('Stop-loss distance cannot be negative')
  })
})
