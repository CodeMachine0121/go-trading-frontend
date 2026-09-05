import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import StrategyBacktestPane from '~/components/organisms/StrategyBacktestPane.vue'
import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import { BacktestApplication } from '~/application/backtest-application'
import { BacktestService } from '~/domain/service/backtest-service'
import { Backtest, ClosedTrade, EquityPoint } from '~/domain/models/entities/backtest'
import { AggregationIntervalDomain } from '~/domain/models/domains/aggregation-interval-domain'
import type { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'
import { StrategyParameterNotDeclaredError } from '~/domain/errors/strategy-parameter-not-declared-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'
import { buildTimeZone } from '../../fixtures/time-zone'

// 繪圖函式庫是最外層的邊界：它需要真正的畫布，而這裡要驗的不是它畫得對不對。
const chartLibrary = vi.hoisted(() => {
  const lineSeries = { setData: vi.fn() }

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

const SCRIPT_BODY = 'return map[string]float64{"signal": 1}'
const REPLAY_START = new Date('2026-08-06T00:00:00Z')
const REPLAY_END = new Date('2026-09-04T23:00:00Z')

function completedBacktest(overrides: Partial<{
  totalReturnRate: number
  winRate: number | null
  closedTrades: ClosedTrade[]
  equityCurve: EquityPoint[]
}> = {}): Backtest {
  return new Backtest(
    'BTCUSDT', '1h', REPLAY_START, REPLAY_END, 3,
    new Decimal('10000'), new Decimal('12500'),
    overrides.totalReturnRate ?? 0.25, 0.1,
    overrides.winRate === undefined ? 0.75 : overrides.winRate,
    4,
    overrides.closedTrades ?? [new ClosedTrade(
      'long', REPLAY_START, new Decimal('100'), REPLAY_END, new Decimal('110'),
      new Decimal('10000'), new Decimal('1000'))],
    overrides.equityCurve ?? [
      new EquityPoint(REPLAY_START, new Decimal('10000')),
      new EquityPoint(REPLAY_END, new Decimal('12500')),
    ])
}

function buildProxy(overrides: Partial<IBacktestProxy> = {}): IBacktestProxy {
  return {
    runBacktest: vi.fn().mockResolvedValue(completedBacktest()),
    ...overrides,
  }
}

function mountPane(proxy: IBacktestProxy, props: Record<string, unknown> = {}) {
  return mount(StrategyBacktestPane, {
    props: {
      backtestApplication: new BacktestApplication(new BacktestService(proxy)),
      tradingSymbolApplication: buildTradingSymbolApplication(),
      timeZone: buildTimeZone(),
      aggregationIntervalOptions: [new AggregationIntervalDomain('1h').toOptionDto()],
      scriptBody: SCRIPT_BODY,
      parameters: [] as StrategyParameterDto[],
      workspaceGeneration: 0,
      symbol: 'BTCUSDT',
      aggregationInterval: '1h',
      ...props,
    },
  })
}

async function runBacktest(wrapper: ReturnType<typeof mountPane>) {
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('StrategyBacktestPane', () => {
  describe('一打開就有的那幾格', () => {
    it('時間區間已經填好，直接按得下去', async () => {
      const proxy = buildProxy()
      const wrapper = mountPane(proxy)

      await runBacktest(wrapper)

      expect(proxy.runBacktest).toHaveBeenCalled()
    })

    it('本金已經填好一個大於零的數', () => {
      const wrapper = mountPane(buildProxy())

      const filled = wrapper.get('[data-testid="backtest-initial-capital-input"]')
        .element as HTMLInputElement
      expect(Number(filled.value)).toBeGreaterThan(0)
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
      await runBacktest(wrapper)

      expect(proxy.runBacktest).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('起點不能晚於終點')
    })

    it('本金留白時說在本金那一格', async () => {
      const proxy = buildProxy()
      const wrapper = mountPane(proxy)

      await wrapper.get('[data-testid="backtest-initial-capital-input"]').setValue('')
      await runBacktest(wrapper)

      expect(proxy.runBacktest).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('請填一個大於零的數')
    })

    it('本金填零時同樣不送出', async () => {
      const proxy = buildProxy()
      const wrapper = mountPane(proxy)

      await wrapper.get('[data-testid="backtest-initial-capital-input"]').setValue('0')
      await runBacktest(wrapper)

      expect(proxy.runBacktest).not.toHaveBeenCalled()
    })

    it('百分比填零時說在那一格', async () => {
      const proxy = buildProxy()
      const wrapper = mountPane(proxy)

      await wrapper.get('[data-testid="backtest-position-sizing-mode-select"]')
        .setValue('percentage')
      await wrapper.get('[data-testid="backtest-position-sizing-value-input"]').setValue('0')
      await runBacktest(wrapper)

      expect(proxy.runBacktest).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('百分比要大於零且不超過一百')
    })

    it('算式空白時說在算式那裡——與指標預覽同一條規則', async () => {
      const proxy = buildProxy()
      const wrapper = mountPane(proxy, { scriptBody: '   ' })

      await runBacktest(wrapper)

      expect(proxy.runBacktest).not.toHaveBeenCalled()
      expect(wrapper.get('[data-testid="backtest-script-body-error"]').text())
        .toContain('請填寫算式內容')
    })
  })

  describe('按下去之後的每一種狀態', () => {
    it('後端連不上時執行鍵停用——按了也沒用', async () => {
      const wrapper = mountPane(buildProxy({
        runBacktest: vi.fn().mockRejectedValue(new BackendUnreachableError('連不上')),
      }))

      await runBacktest(wrapper)

      expect(wrapper.find('[data-testid="backtest-unreachable-alert"]').exists()).toBe(true)
      expect(wrapper.get('[data-testid="run-backtest-button"]').attributes('disabled'))
        .toBeDefined()
    })

    it('算式出錯時說成算式的問題', async () => {
      const wrapper = mountPane(buildProxy({
        runBacktest: vi.fn().mockRejectedValue(new IndicatorScriptFailedError('算式執行失敗')),
      }))

      await runBacktest(wrapper)

      expect(wrapper.get('[data-testid="backtest-script-failed-alert"]').text())
        .toContain('算式執行失敗')
    })

    it('名字對不上時說成參數的問題，不是算式壞了', async () => {
      const wrapper = mountPane(buildProxy({
        runBacktest: vi.fn().mockRejectedValue(
          new StrategyParameterNotDeclaredError('期數', '算式取用了參數 "期數"')),
      }))

      await runBacktest(wrapper)

      expect(wrapper.get('[data-testid="backtest-parameter-not-declared-alert"]').text())
        .toContain('期數')
      expect(wrapper.find('[data-testid="backtest-script-failed-alert"]').exists()).toBe(false)
    })

    it('後端自己壞掉時說清楚不是使用者的請求有問題', async () => {
      const wrapper = mountPane(buildProxy({
        runBacktest: vi.fn().mockRejectedValue(new BackendServerError('內部錯誤')),
      }))

      await runBacktest(wrapper)

      expect(wrapper.get('[data-testid="backtest-server-error-alert"]').text())
        .toContain('不是你的請求有問題')
    })

    it('這一次的錯誤不會被上一次的成績單蓋住', async () => {
      const runBacktestMock = vi.fn()
        .mockResolvedValueOnce(completedBacktest())
        .mockRejectedValueOnce(new BackendRequestRejectedError('這一段重演不了'))
      const wrapper = mountPane(buildProxy({ runBacktest: runBacktestMock }))

      await runBacktest(wrapper)
      expect(wrapper.find('[data-testid="summary-total-return-rate"]').exists()).toBe(true)

      await runBacktest(wrapper)

      expect(wrapper.find('[data-testid="summary-total-return-rate"]').exists()).toBe(false)
      expect(wrapper.get('[data-testid="backtest-request-rejected-alert"]').text())
        .toContain('這一段重演不了')
    })

    it('換了一份工作區就把上一次的成績單清掉', async () => {
      // 換了一份算式，上一次那次重演與畫面上這一份已經無關了。
      const wrapper = mountPane(buildProxy())

      await runBacktest(wrapper)
      expect(wrapper.find('[data-testid="summary-total-return-rate"]').exists()).toBe(true)

      await wrapper.setProps({ workspaceGeneration: 1 })
      await flushPromises()

      expect(wrapper.find('[data-testid="summary-total-return-rate"]').exists()).toBe(false)
    })
  })

  describe('算完之後三塊東西一起出現', () => {
    it('成績單、資金曲線與交易明細同時在畫面上', async () => {
      const wrapper = mountPane(buildProxy())

      await runBacktest(wrapper)

      expect(wrapper.find('[data-testid="summary-total-return-rate"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="equity-curve-chart"]').exists()).toBe(true)
      expect(wrapper.findAll('[data-testid="trade-row"]')).toHaveLength(1)
    })

    it('賺的總報酬率是綠的', async () => {
      const wrapper = mountPane(buildProxy({
        runBacktest: vi.fn().mockResolvedValue(completedBacktest({ totalReturnRate: 0.25 })),
      }))

      await runBacktest(wrapper)

      const cell = wrapper.get('[data-testid="summary-total-return-rate"]')
      expect(cell.text()).toBe('+25.00%')
      expect(cell.classes().some(name => name.endsWith('--positive'))).toBe(true)
    })

    it('賠的總報酬率是紅的', async () => {
      const wrapper = mountPane(buildProxy({
        runBacktest: vi.fn().mockResolvedValue(completedBacktest({ totalReturnRate: -0.08 })),
      }))

      await runBacktest(wrapper)

      const cell = wrapper.get('[data-testid="summary-total-return-rate"]')
      expect(cell.text()).toBe('-8.00%')
      expect(cell.classes().some(name => name.endsWith('--negative'))).toBe(true)
    })

    it('賺的那一筆交易綠、賠的那一筆紅', async () => {
      const wrapper = mountPane(buildProxy({
        runBacktest: vi.fn().mockResolvedValue(completedBacktest({
          closedTrades: [
            new ClosedTrade('long', REPLAY_START, new Decimal('100'), REPLAY_END,
              new Decimal('110'), new Decimal('10000'), new Decimal('300')),
            new ClosedTrade('short', REPLAY_START, new Decimal('100'), REPLAY_END,
              new Decimal('110'), new Decimal('10000'), new Decimal('-120')),
          ],
        })),
      }))

      await runBacktest(wrapper)

      const profits = wrapper.findAll('[data-testid="trade-profit"]')
      expect(profits[0]!.text()).toBe('300')
      expect(profits[0]!.classes().some(name => name.endsWith('--positive'))).toBe(true)
      expect(profits[1]!.text()).toBe('-120')
      expect(profits[1]!.classes().some(name => name.endsWith('--negative'))).toBe(true)
    })

    it('一筆都沒平倉時勝率說不適用，不是 0%', async () => {
      const wrapper = mountPane(buildProxy({
        runBacktest: vi.fn().mockResolvedValue(
          completedBacktest({ winRate: null, closedTrades: [] })),
      }))

      await runBacktest(wrapper)

      expect(wrapper.get('[data-testid="summary-win-rate"]').text()).toBe('不適用')
    })

    it('一筆交易都沒有時明講，而不是留一張空白表格', async () => {
      // 空白讓人以為壞了，明講讓人知道是策略沒開口。
      const wrapper = mountPane(buildProxy({
        runBacktest: vi.fn().mockResolvedValue(
          completedBacktest({ winRate: null, closedTrades: [] })),
      }))

      await runBacktest(wrapper)

      expect(wrapper.get('[data-testid="no-trades"]').text())
        .toContain('這段期間沒有觸發任何交易')
      expect(wrapper.findAll('[data-testid="trade-row"]')).toHaveLength(0)
    })

    it('資金曲線的每一點都交給繪圖函式庫，順序不變', async () => {
      const wrapper = mountPane(buildProxy())

      await runBacktest(wrapper)
      await flushPromises()

      const drawn = chartLibrary.lineSeries.setData.mock.calls.at(-1)?.[0] as
        { value: number }[] | undefined
      expect(drawn).toHaveLength(2)
      expect(drawn![0]!.value).toBe(10000)
      expect(drawn![1]!.value).toBe(12500)
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
