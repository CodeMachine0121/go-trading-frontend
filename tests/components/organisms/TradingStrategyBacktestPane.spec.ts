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

const REPLAY_START = new Date('2026-08-06T00:00:00Z')
const REPLAY_END = new Date('2026-09-04T23:00:00Z')

function completedBacktest(conflictedCandleCount = 0): Backtest {
  return new Backtest(
    'BTCUSDT', '1h', REPLAY_START, REPLAY_END, 3,
    new Decimal('10000'), new Decimal('12500'),
    // 開一次、平一次——兩者對得上才是一個到得了的狀態。
    0.25, 0.1, 0.75, 1,
    conflictedCandleCount,
    0,
    0,
    new Decimal(0),
    [new ClosedTrade(
      'long', REPLAY_START, new Decimal('100'), REPLAY_END, new Decimal('110'),
      new Decimal('10000'), new Decimal('1000'), 'signal', new Decimal(0), new Decimal(0))],
    [
      new EquityPoint(REPLAY_START, new Decimal('10000')),
      new EquityPoint(REPLAY_END, new Decimal('12500')),
    ])
}

function buildProxy(overrides: Partial<IBacktestProxy> = {}): IBacktestProxy {
  return {
    runBacktest: vi.fn().mockResolvedValue(completedBacktest()),
    runTradingStrategyBacktest: vi.fn().mockResolvedValue(completedBacktest()),
    runContractBacktest: vi.fn().mockResolvedValue(completedBacktest()),
    runContractTradingStrategyBacktest: vi.fn().mockResolvedValue(completedBacktest()),
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
      // 刻度由那份交易策略的訊號來源自己說。畫一個挑得動的選單，
      // 等於在畫面上放第二個答案而沒有規則說哪一個贏。
      const wrapper = mountPane(buildProxy())

      expect(wrapper.find('[data-testid="backtest-aggregation-interval-select"]').exists())
        .toBe(false)
      expect(wrapper.get('[data-testid="backtest-aggregation-interval-note"]').text())
        .toContain('訊號來源')
    })

    it('沒有算式那一格——那是每個訊號來源各自指名的', () => {
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

// 這一塊上一次來的時候，開頭是四顆挑交易模式的按鈕。整組拿掉之後，讀它的斷言
// 也一起被刪掉了——而被刪掉的斷言是沉默，不是失敗：任何人把那一格放回來，
// 這個檔案仍然全綠，而送出去的請求會被後端拒絕。所以這裡改問缺席。
describe('TradingStrategyBacktestPane 沒有那三格可以填', () => {
  it.each([
    ['交易模式', '-radio'],
    ['槓桿倍數', 'backtest-leverage-input'],
    ['維持保證金率', 'backtest-maintenance-margin-rate-input'],
  ])('%s 在這一邊一格都沒有', async (_name, testIdFragment) => {
    const wrapper = mountPane(buildProxy())
    await flushPromises()

    // 挑模式的那四顆是這一塊唯一用過的單選鈕，所以「一顆單選鈕都沒有」
    // 就是「挑不到模式」——比對一個已經刪掉的 testid 全稱要難繞過得多。
    expect(wrapper.html()).not.toContain(testIdFragment)
  })

  it('這一邊一個字都沒提那四種規矩', async () => {
    const wrapper = mountPane(buildProxy())
    await flushPromises()

    for (const goneSpelling of ['多空反手', '槓桿做多', '只做空', '維持保證金']) {
      expect(wrapper.text()).not.toContain(goneSpelling)
    }

    // 與上面幾條並排，這一條才有意義：它證明上面不是因為整塊畫面空了才過。
    expect(wrapper.find('[data-testid="backtest-entry-cost-percentage-input"]').exists())
      .toBe(true)
    expect(wrapper.find('[data-testid="symbol-select"]').exists()).toBe(true)
  })
})

describe('TradingStrategyBacktestPane 這一次交易要付多少', () => {
  it('兩個費率在這一邊也是填得動的輸入框，而且一字不差', async () => {
    // 與那兩個出場距離同一個理由：一份交易策略對「它的主人的券商收多少」
    // 沒有意見。兩張表單共用同一個元件，所以「一字不差」是結構上的事實。
    const proxy = buildProxy()
    const wrapper = mountPane(proxy)

    await wrapper.get('[data-testid="backtest-entry-cost-percentage-input"]')
      .setValue('0.0855')
    await wrapper.get('[data-testid="backtest-exit-cost-percentage-input"]')
      .setValue('0.3855')
    await fillSymbolAndRun(wrapper)

    const request = vi.mocked(proxy.runTradingStrategyBacktest).mock.calls[0]![0]
    expect(request.entryCostPercentage.toString()).toBe('0.0855')
    expect(request.exitCostPercentage.toString()).toBe('0.3855')
  })

  it('這一邊的費率填錯也不送出，句子一字不差', async () => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy)

    await wrapper.get('[data-testid="backtest-entry-cost-percentage-input"]').setValue('-1')
    await fillSymbolAndRun(wrapper)

    expect(proxy.runTradingStrategyBacktest).not.toHaveBeenCalled()
    expect(wrapper.get('.backtest-condition-fields__transaction-costs')
      .get('[data-testid="field-error"]').text())
      .toBe('進場成本率不得為負——負的成本等於交易就送錢')
  })

  it('預設兩格留白，這一刀之前的每一次重演都是這樣', async () => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy)

    await fillSymbolAndRun(wrapper)

    const request = vi.mocked(proxy.runTradingStrategyBacktest).mock.calls[0]![0]
    expect(request.entryCostPercentage.isZero()).toBe(true)
    expect(request.exitCostPercentage.isZero()).toBe(true)
  })
})

describe('TradingStrategyBacktestPane 這一次要不要模擬出場', () => {
  it('兩個出場距離在這一邊是填得動的輸入框，不是一句話', async () => {
    // 彙總刻度在這一邊是一句話（那份交易策略自己說的），而這兩格不是：
    // 一份交易策略對「它的主人能忍多少」沒有意見。
    const proxy = buildProxy()
    const wrapper = mountPane(proxy)

    await wrapper.get('[data-testid="backtest-stop-loss-percentage-input"]').setValue('2')
    await wrapper.get('[data-testid="backtest-take-profit-percentage-input"]').setValue('5')
    await fillSymbolAndRun(wrapper)

    const request = vi.mocked(proxy.runTradingStrategyBacktest).mock.calls[0]![0]
    expect(request.stopLossPercentage.toString()).toBe('2')
    expect(request.takeProfitPercentage.toString()).toBe('5')
  })

  it('這一邊的距離填錯也不送出，句子一字不差', async () => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy)

    await wrapper.get('[data-testid="backtest-take-profit-percentage-input"]').setValue('-5')
    await fillSymbolAndRun(wrapper)

    expect(proxy.runTradingStrategyBacktest).not.toHaveBeenCalled()
    expect(wrapper.get('.backtest-condition-fields__exit-levels')
      .get('[data-testid="field-error"]').text()).toContain('止盈距離不得為負')
  })
})
