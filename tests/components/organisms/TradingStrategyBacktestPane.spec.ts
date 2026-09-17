import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import TradingStrategyBacktestPane from '~/components/organisms/TradingStrategyBacktestPane.vue'
import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import { BacktestApplication } from '~/application/backtest-application'
import { BacktestService } from '~/domain/service/backtest-service'
import { Backtest, ClosedTrade, EquityPoint } from '~/domain/models/entities/backtest'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
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

const REPLAY_START = new Date('2026-08-06T00:00:00Z')
const REPLAY_END = new Date('2026-09-04T23:00:00Z')

function completedBacktest(conflictedCandleCount = 0): Backtest {
  return new Backtest(
    'BTCUSDT', '1h', REPLAY_START, REPLAY_END, 3,
    new Decimal('10000'), new Decimal('12500'),
    0.25, 0.1, 0.75, 4,
    conflictedCandleCount,
    [new ClosedTrade(
      'long', REPLAY_START, new Decimal('100'), REPLAY_END, new Decimal('110'),
      new Decimal('10000'), new Decimal('1000'))],
    [
      new EquityPoint(REPLAY_START, new Decimal('10000')),
      new EquityPoint(REPLAY_END, new Decimal('12500')),
    ])
}

function buildProxy(overrides: Partial<IBacktestProxy> = {}): IBacktestProxy {
  return {
    runBacktest: vi.fn().mockResolvedValue(completedBacktest()),
    runTradingStrategyBacktest: vi.fn().mockResolvedValue(completedBacktest()),
    ...overrides,
  }
}

function mountPane(proxy: IBacktestProxy, props: Record<string, unknown> = {}) {
  return mount(TradingStrategyBacktestPane, {
    props: {
      backtestApplication: new BacktestApplication(new BacktestService(proxy)),
      tradingSymbolApplication: buildTradingSymbolApplication(),
      timeZone: buildTimeZone(),
      tradingStrategyId: 7,
      savedGeneration: 0,
      ...props,
    },
  })
}

async function fillSymbolAndRun(wrapper: ReturnType<typeof mountPane>) {
  // 標的清單是從外面讀回來的，選單要等它回來才挑得動。
  await flushPromises()
  await wrapper.get('[data-testid="symbol-select"]').setValue('BTCUSDT')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('TradingStrategyBacktestPane', () => {
  describe('要填的比重演一支腳本少兩格', () => {
    it('彙總刻度是一句話，不是挑得動的選單', () => {
      // 刻度由那份交易策略的信號來源自己說。畫一個挑得動的選單，
      // 等於在畫面上放第二個答案而沒有規則說哪一個贏。
      const wrapper = mountPane(buildProxy())

      expect(wrapper.find('[data-testid="backtest-aggregation-interval-select"]').exists())
        .toBe(false)
      expect(wrapper.get('[data-testid="backtest-aggregation-interval-note"]').text())
        .toContain('信號來源')
    })

    it('沒有算式那一格——那是每個信號來源各自指名的', () => {
      const wrapper = mountPane(buildProxy())

      expect(wrapper.find('[data-testid="script-editor"]').exists()).toBe(false)
    })
  })

  describe('還沒存過的那一份', () => {
    it('說清楚下一步是先存，而不是讓他填完才被擋下來', () => {
      const wrapper = mountPane(buildProxy(), { tradingStrategyId: null })

      expect(wrapper.get('[data-testid="trading-strategy-backtest-unsaved"]').text())
        .toContain('先存起來')
      expect(wrapper.get('[data-testid="run-backtest-button"]').attributes('disabled'))
        .toBeDefined()
    })

    it('存過之後那句話就不見了', () => {
      const wrapper = mountPane(buildProxy())

      expect(wrapper.find('[data-testid="trading-strategy-backtest-unsaved"]').exists())
        .toBe(false)
      expect(wrapper.get('[data-testid="run-backtest-button"]').attributes('disabled'))
        .toBeUndefined()
    })
  })

  describe('重演這一份', () => {
    it('送出去的是那一份的識別碼，不是任何一支腳本', async () => {
      const proxy = buildProxy()
      const wrapper = mountPane(proxy)

      await fillSymbolAndRun(wrapper)

      expect(proxy.runBacktest).not.toHaveBeenCalled()
      expect(proxy.runTradingStrategyBacktest).toHaveBeenCalledTimes(1)
      expect(vi.mocked(proxy.runTradingStrategyBacktest).mock.calls[0]![0].tradingStrategyId)
        .toBe(7)
    })

    it('成績單、資金曲線與交易明細同時在畫面上', async () => {
      const wrapper = mountPane(buildProxy())

      await fillSymbolAndRun(wrapper)

      expect(wrapper.find('[data-testid="summary-total-return-rate"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="equity-curve-chart"]').exists()).toBe(true)
      expect(wrapper.findAll('[data-testid="trade-row"]').length).toBe(1)
    })

    it('算的時候顯示進行中，執行鍵停用', async () => {
      // 避免他以為沒反應而按第二次。
      let finishRun: (backtest: Backtest) => void = () => {}
      const wrapper = mountPane(buildProxy({
        runTradingStrategyBacktest: vi.fn(() => new Promise<Backtest>((resolve) => {
          finishRun = resolve
        })),
      }))

      await fillSymbolAndRun(wrapper)

      expect(wrapper.find('[data-testid="backtest-running-alert"]').exists()).toBe(true)
      expect(wrapper.get('[data-testid="run-backtest-button"]').attributes('disabled'))
        .toBeDefined()

      finishRun(completedBacktest())
      await flushPromises()

      expect(wrapper.find('[data-testid="backtest-running-alert"]').exists()).toBe(false)
    })
  })

  describe('打架的那幾棒', () => {
    it('打架過就在成績單上說出幾棒', async () => {
      // 一份打架到底的交易策略幾乎不進場，成績單會顯得「很穩」——
      // 不說出來的話，那張成績單會被當成真的。
      const wrapper = mountPane(buildProxy({
        runTradingStrategyBacktest: vi.fn().mockResolvedValue(completedBacktest(180)),
      }))

      await fillSymbolAndRun(wrapper)

      expect(wrapper.get('[data-testid="summary-conflicted-candle-count"]').text())
        .toContain('180')
    })

    it('一棒都沒打架過就不佔版面', async () => {
      const wrapper = mountPane(buildProxy())

      await fillSymbolAndRun(wrapper)

      expect(wrapper.find('[data-testid="summary-conflicted-candle-count"]').exists())
        .toBe(false)
    })
  })

  describe('出錯的時候', () => {
    it('來源刻度對不起來時，說明落在市場那一格旁邊', async () => {
      const wrapper = mountPane(buildProxy({
        runTradingStrategyBacktest: vi.fn().mockRejectedValue(
          new BacktestFieldError('symbol', '這一份的信號來源用了不只一種彙總刻度')),
      }))

      await fillSymbolAndRun(wrapper)

      expect(wrapper.findAll('[data-testid="field-error"]').map(node => node.text()))
        .toContain('這一份的信號來源用了不只一種彙總刻度')
    })

    it('任何一支腳本壞掉時說成算式的問題', async () => {
      const wrapper = mountPane(buildProxy({
        runTradingStrategyBacktest: vi.fn().mockRejectedValue(
          new IndicatorScriptFailedError('第 3 行出錯')),
      }))

      await fillSymbolAndRun(wrapper)

      expect(wrapper.get('[data-testid="backtest-script-failed-alert"]').text())
        .toContain('第 3 行出錯')
    })

    it('後端連不上時執行鍵停用——按了也沒用', async () => {
      const wrapper = mountPane(buildProxy({
        runTradingStrategyBacktest: vi.fn().mockRejectedValue(
          new BackendUnreachableError('連不上')),
      }))

      await fillSymbolAndRun(wrapper)

      expect(wrapper.find('[data-testid="backtest-unreachable-alert"]').exists()).toBe(true)
      expect(wrapper.get('[data-testid="run-backtest-button"]').attributes('disabled'))
        .toBeDefined()
    })
  })

  describe('規則被改存過之後', () => {
    it('上一次的成績單清掉——它說的是上一版的規則', async () => {
      const wrapper = mountPane(buildProxy())

      await fillSymbolAndRun(wrapper)
      expect(wrapper.find('[data-testid="summary-total-return-rate"]').exists()).toBe(true)

      await wrapper.setProps({ savedGeneration: 1 })
      await flushPromises()

      expect(wrapper.find('[data-testid="summary-total-return-rate"]').exists()).toBe(false)
    })
  })
})

describe('TradingStrategyBacktestPane 照哪一套規矩操作', () => {
  it('兩個選項同時看得見，與指標計算那一頁一樣', async () => {
    const wrapper = mountPane(buildProxy())

    expect(wrapper.find('[data-testid="backtest-trading-mode-longShort-radio"]').exists())
      .toBe(true)
    expect(wrapper.find('[data-testid="backtest-trading-mode-spot-radio"]').exists())
      .toBe(true)
  })

  it('那兩句說明與指標計算那一頁一字不差', () => {
    // 兩頁都跟同一個地方拿這兩句話，所以它們不可能各自漂移。
    // 這一條釘的就是「不可能」——兩份字串的那一版會先在一頁上被改掉，而沒有人發現。
    const application = new BacktestApplication(new BacktestService(buildProxy()))
    const wrapper = mountPane(buildProxy())

    for (const option of application.listTradingModeOptions()) {
      expect(wrapper.get(`[data-testid="backtest-trading-mode-${option.value}-radio"]`).text())
        .toContain(option.description)
    }
  })

  it('挑了現貨，重演這一份交易策略時送出去的就是現貨', async () => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy)

    await wrapper.get('[data-testid="backtest-trading-mode-spot-radio"] input').setValue()
    await fillSymbolAndRun(wrapper)

    expect(vi.mocked(proxy.runTradingStrategyBacktest).mock.calls[0]![0].tradingMode)
      .toBe('spot')
  })

  it('一打開停在既有的那一種', async () => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy)

    await fillSymbolAndRun(wrapper)

    expect(vi.mocked(proxy.runTradingStrategyBacktest).mock.calls[0]![0].tradingMode)
      .toBe('longShort')
  })
})

// Setting up a replay for a strategy that has not been saved yet is the ordinary way
// into this tab, and every other field on it is editable and pre-filled while that is
// true. The mode has to be too: picking it sends nothing anywhere, and greying out the
// one field this slice added would make it the only input on the form that greys out.
it('後端連不上、或這一份還沒存過時，交易模式仍然挑得動', async () => {
  const wrapper = mountPane(buildProxy(), { tradingStrategyId: null })

  const spotRadio = wrapper.get<HTMLInputElement>(
    '[data-testid="backtest-trading-mode-spot-radio"] input')

  expect(spotRadio.element.disabled).toBe(false)
  // 執行鍵仍然停用——按了也沒用的是那一顆，不是這一格。
  expect(wrapper.get<HTMLButtonElement>(
    '[data-testid="run-backtest-button"]').element.disabled).toBe(true)
})
