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
      savedTradingMode: 'longShort',
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

// 交易模式是那一份交易策略記著的性質，不是這一次重演的旋鈕。
// 這一塊因此挑不動它——它讀出來給人看。
describe('TradingStrategyBacktestPane 照哪一套規矩操作', () => {
  it('那裡沒有可以按的東西，只有一句話', () => {
    const wrapper = mountPane(buildProxy())

    // 不是停用的按鈕：一顆灰掉的按鈕還在說「這裡有兩個選項，只是你現在不能動」，
    // 而真相是這裡已經沒有選項了、答案在別的地方。
    expect(wrapper.find('[data-testid="backtest-trading-mode-longShort-radio"]').exists())
      .toBe(false)
    expect(wrapper.find('[data-testid="backtest-trading-mode-spot-radio"]').exists())
      .toBe(false)
    expect(wrapper.find('[data-testid="backtest-trading-mode-note"]').exists()).toBe(true)
  })

  it('那一句話講出這一份存著的是哪一種', () => {
    const spotPane = mountPane(buildProxy(), { savedTradingMode: 'spot' })
    const longShortPane = mountPane(buildProxy(), { savedTradingMode: 'longShort' })

    expect(spotPane.get('[data-testid="backtest-trading-mode-note"]').text())
      .toContain('現貨')
    expect(longShortPane.get('[data-testid="backtest-trading-mode-note"]').text())
      .toContain('多空反手')
  })

  it('那一句話裡的名字與說明與工作檯、與重演一支腳本讀的是同一份', () => {
    // 三塊畫面都跟同一個地方拿這兩句話，所以它們不可能各自漂移。
    // 這一條釘的就是「不可能」——三份字串的那一版會先在一頁上被改掉，而沒有人發現。
    const application = new BacktestApplication(new BacktestService(buildProxy()))
    const spotOption = application.listTradingModeOptions()
      .find(option => option.value === 'spot')!

    const wrapper = mountPane(buildProxy(), { savedTradingMode: 'spot' })

    const note = wrapper.get('[data-testid="backtest-trading-mode-note"]').text()
    expect(note).toContain(spotOption.label)
    expect(note).toContain(spotOption.description)
  })

  it('還沒存過的那一份講預設值', () => {
    // 與後端對一份沒填的交易策略的讀法一字不差。
    const wrapper = mountPane(
      buildProxy(), { tradingStrategyId: null, savedTradingMode: null })

    expect(wrapper.get('[data-testid="backtest-trading-mode-note"]').text())
      .toContain('多空反手')
  })

  it('存好之後那一句話跟著換', async () => {
    // 存成功會換掉頁面手上那一份，而那一句話讀的就是它。
    // 不跟著換的話，使用者會在一張寫著舊模式的標籤底下按執行。
    const wrapper = mountPane(buildProxy(), { savedTradingMode: 'longShort' })
    expect(wrapper.get('[data-testid="backtest-trading-mode-note"]').text())
      .toContain('多空反手')

    await wrapper.setProps({ savedTradingMode: 'spot' })

    expect(wrapper.get('[data-testid="backtest-trading-mode-note"]').text())
      .toContain('現貨')
  })

  it('送出去的請求裡沒有交易模式', async () => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy, { savedTradingMode: 'spot' })

    await fillSymbolAndRun(wrapper)

    // 後端從那一份交易策略讀它。這一側送過去只會是第二個答案，
    // 而沒有規則說哪一個贏。
    expect(vi.mocked(proxy.runTradingStrategyBacktest).mock.calls[0]![0])
      .not.toHaveProperty('tradingMode')
  })
})
