import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import StrategyScriptBacktestPane from '~/components/organisms/StrategyScriptBacktestPane.vue'
import TradingStrategyBacktestPane from '~/components/organisms/TradingStrategyBacktestPane.vue'
import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import { BacktestApplication } from '~/application/backtest-application'
import { BacktestService } from '~/domain/service/backtest-service'
import { Backtest, BacktestTradeStatistics, ContractBacktestFigures, EquityPoint } from '~/domain/models/entities/backtest'
import { AggregationIntervalDomain } from '~/domain/models/domains/aggregation-interval-domain'
import { BacktestTimeAllowanceSpentError } from '~/domain/errors/backtest-time-allowance-spent-error'
import { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'
import { buildContractTradingSymbol, buildContractTradingSymbolProxy } from '../../fixtures/contract-proxies'
import { buildTimeZone } from '../../fixtures/time-zone'

vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => ({
    addSeries: vi.fn(() => ({ setData: vi.fn() })),
    applyOptions: vi.fn(),
    timeScale: vi.fn(() => ({ fitContent: vi.fn() })),
    remove: vi.fn(),
  })),
  LineSeries: 'LineSeries',
}))

function replayOf(
  startTime: string, endTime: string,
  split: { inSample: Backtest, validation: Backtest } | null = null,
  contractFigures: ContractBacktestFigures | null = null,
): Backtest {
  return new Backtest(
    'BTCUSDT', '1h', new Date(startTime), new Date(endTime), 2,
    new Decimal(10000), new Decimal(10500), 0.05, 0.01, 0.5, 0, 0, 0, 0, new Decimal(0), [],
    [new EquityPoint(new Date(startTime), new Decimal(10000))],
    contractFigures,
    new BacktestTradeStatistics(2.5, new Decimal(75), 9000, 1, 0.25),
    'nextOpen',
    split === null ? null : new Date('2026-01-21T00:00:00Z'),
    split?.inSample ?? null,
    split?.validation ?? null)
}

function buildProxy(resolved: Backtest = replayOf('2026-01-01T00:00:00Z', '2026-01-31T23:00:00Z')): IBacktestProxy {
  return {
    runBacktest: vi.fn().mockResolvedValue(resolved),
    runTradingStrategyBacktest: vi.fn().mockResolvedValue(resolved),
    runContractBacktest: vi.fn().mockResolvedValue(resolved),
    runContractTradingStrategyBacktest: vi.fn().mockResolvedValue(resolved),
  }
}

function mountScriptPane(proxy: IBacktestProxy) {
  return mount(StrategyScriptBacktestPane, {
    props: {
      backtestApplication: new BacktestApplication(new BacktestService(proxy)),
      tradingSymbolApplication: buildTradingSymbolApplication(),
      timeZone: buildTimeZone(),
      aggregationIntervalOptions: [new AggregationIntervalDomain('1h').toOptionDto()],
      script: 'return indicator.Buy',
      resultType: 'signal',
      parameters: [],
      workspaceGeneration: 0,
      symbol: 'BTCUSDT',
      aggregationInterval: '1h',
    },
    // 曲線畫得對不對不是這裡要驗的事；分段結果一次掛三張圖，換成替身讓測試只看結構。
    global: { stubs: { BacktestEquityCurveChart: true } },
  })
}

async function fillStretch(wrapper: ReturnType<typeof mount>, validationStartTime: string) {
  await wrapper.get('[data-testid="backtest-start-time-input"]').setValue('2026-01-01T00:00')
  await wrapper.get('[data-testid="backtest-end-time-input"]').setValue('2026-01-31T23:59')
  await wrapper.get('[data-testid="backtest-validation-start-time-input"]').setValue(validationStartTime)
}

async function submit(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('短線回測條件（重演一支腳本）', () => {
  it('選下一格開盤成交並給驗證起點，兩格一起送出', async () => {
    const proxy = buildProxy()
    const wrapper = mountScriptPane(proxy)

    await wrapper.get('[data-testid="backtest-fill-timing-select"]').setValue('nextOpen')
    await fillStretch(wrapper, '2026-01-21T00:00')
    await submit(wrapper)

    const [requestDomain] = vi.mocked(proxy.runBacktest).mock.calls[0]!
    expect(requestDomain.fillTiming.value).toBe('nextOpen')
    expect(requestDomain.validationStartTime).toEqual(buildTimeZone().parseMinuteInput('2026-01-21T00:00'))
  })

  it('成交時點沒動、驗證起點留白時照今天一樣', async () => {
    const proxy = buildProxy()
    const wrapper = mountScriptPane(proxy)

    await submit(wrapper)

    const [requestDomain] = vi.mocked(proxy.runBacktest).mock.calls[0]!
    expect(requestDomain.fillTiming.isDefault).toBe(true)
    expect(requestDomain.validationStartTime).toBeNull()
  })

  it.each([
    ['等於期間起點', '2026-01-01T00:00'],
    ['晚於期間終點', '2026-02-05T00:00'],
  ])('驗證起點%s時不送出，說明留在那一格旁邊', async (_, validationStartTime) => {
    const proxy = buildProxy()
    const wrapper = mountScriptPane(proxy)

    await fillStretch(wrapper, validationStartTime)
    await submit(wrapper)

    expect(proxy.runBacktest).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('驗證起點必須落在期間之內（晚於起點、早於終點）')
  })

  it('沒在允許時間內跑完時說沒有成績單與下一步，不說成算式的問題', async () => {
    const proxy = buildProxy()
    vi.mocked(proxy.runBacktest).mockRejectedValue(new BacktestTimeAllowanceSpentError('重演在 90 秒內沒跑完'))
    const wrapper = mountScriptPane(proxy)

    await submit(wrapper)

    const alert = wrapper.get('[data-testid="backtest-time-allowance-spent-alert"]').text()
    expect(alert).toContain('沒有成績單')
    expect(alert).toContain('縮短期間')
    expect(alert).toContain('粗一點的彙總刻度')
    expect(wrapper.find('[data-testid="backtest-script-failed-alert"]').exists()).toBe(false)
  })
})

describe('短線回測結果', () => {
  it('有驗證起點時由上而下是驗證段、調參段、整段，驗證段說以它為準', async () => {
    const wrapper = mountScriptPane(buildProxy(replayOf('2026-01-01T00:00:00Z', '2026-01-31T23:00:00Z', {
      inSample: replayOf('2026-01-01T00:00:00Z', '2026-01-20T23:00:00Z'),
      validation: replayOf('2026-01-21T00:00:00Z', '2026-01-31T23:00:00Z'),
    })))

    await submit(wrapper)

    const sectionKinds = wrapper.findAll('[data-testid^="backtest-result-section-"]')
      .map(section => section.attributes('data-testid'))
      .filter(testId => !testId?.endsWith('-note'))
    expect(sectionKinds).toEqual([
      'backtest-result-section-validation', 'backtest-result-section-inSample', 'backtest-result-section-whole'])
    expect(wrapper.get('[data-testid="backtest-result-section-validation-note"]').text())
      .toBe('這一段是調參數時沒看過的行情，以它為準')
    expect(wrapper.get('[data-testid="backtest-result-section-inSample-note"]').text())
      .toBe('這一段是拿來調參數的，成績好看是應該的')
  })

  it('沒有驗證起點時只有一塊，沒有分段字樣', async () => {
    const wrapper = mountScriptPane(buildProxy())

    await submit(wrapper)

    const sections = wrapper.findAll('section[data-testid^="backtest-result-section-"]')
    expect(sections).toHaveLength(1)
    expect(sections[0]!.find('[data-testid="backtest-result-section-whole-note"]').exists()).toBe(false)
    expect(sections[0]!.text()).not.toContain('驗證段')
    expect(sections[0]!.text()).not.toContain('調參段')
  })

  it('成績單寫出五格與成交時點', async () => {
    const wrapper = mountScriptPane(buildProxy())

    await submit(wrapper)

    expect(wrapper.get('[data-testid="summary-profit-factor"]').text()).toBe('2.50')
    expect(wrapper.get('[data-testid="summary-expectancy"]').text()).toBe('75.00')
    expect(wrapper.get('[data-testid="summary-average-holding-time"]').text()).toBe('2 小時 30 分')
    expect(wrapper.get('[data-testid="summary-maximum-consecutive-loss-count"]').text()).toBe('1 筆')
    expect(wrapper.get('[data-testid="summary-cost-to-gross-profit-ratio"]').text()).toBe('25.00%')
    expect(wrapper.get('[data-testid="summary-fill-timing"]').text()).toBe('下一格開盤成交')
  })
})

describe('短線回測條件（重演一份合約交易策略）', () => {
  it('也有成交時點與驗證起點兩格，並一起送出', async () => {
    const proxy = buildProxy(replayOf('2026-01-01T00:00:00Z', '2026-01-31T23:00:00Z', null,
      new ContractBacktestFigures('longOnly', new Decimal(3), 0, new Decimal(0), 0, null, 0, null, 0, 'smallestTier', null)))
    const wrapper = mount(TradingStrategyBacktestPane, {
      props: {
        backtestApplication: new BacktestApplication(new BacktestService(proxy)),
        tradingSymbolApplication: new TradingSymbolApplication(new TradingSymbolService(
          { findTradingSymbols: vi.fn().mockResolvedValue([]) },
          buildContractTradingSymbolProxy([buildContractTradingSymbol('BTCUSDT')]))),
        timeZone: buildTimeZone(),
        tradingStrategyId: 7,
        savedGeneration: 0,
        marketDataKind: 'contractKCandle',
        replaysOnContractAccount: true,
        tradingModeLabel: '只做多',
      },
    })
    await flushPromises()

    await wrapper.get('[data-testid="contract-symbol-select"]').setValue('BTCUSDT')
    await wrapper.get('[data-testid="backtest-fill-timing-select"]').setValue('nextOpen')
    await fillStretch(wrapper, '2026-01-21T00:00')
    await submit(wrapper)

    const [requestDomain] = vi.mocked(proxy.runContractTradingStrategyBacktest).mock.calls[0]!
    expect(requestDomain.fillTiming.value).toBe('nextOpen')
    expect(requestDomain.validationStartTime).not.toBeNull()
  })
})
