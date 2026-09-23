import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import TradingStrategyBacktestPane from '~/components/organisms/TradingStrategyBacktestPane.vue'
import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import { BacktestApplication } from '~/application/backtest-application'
import { BacktestService } from '~/domain/service/backtest-service'
import { Backtest, ContractBacktestFigures, EquityPoint } from '~/domain/models/entities/backtest'
import { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
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

const REPLAY_START = new Date('2026-08-06T00:00:00Z')

function contractBacktest(): Backtest {
  return new Backtest(
    'BTCUSDT', '1h', REPLAY_START, REPLAY_START, 2, new Decimal(10000), new Decimal(10000),
    0, 0, null, 0, 0, 0, 0, new Decimal(0), [],
    [new EquityPoint(REPLAY_START, new Decimal(10000))],
    new ContractBacktestFigures(
      'longOnly', new Decimal(3), 0, new Decimal(0), 0, null, 0, null, 0, 'smallestTier', null))
}

function buildProxy(): IBacktestProxy {
  return {
    runBacktest: vi.fn().mockResolvedValue(contractBacktest()),
    runTradingStrategyBacktest: vi.fn().mockResolvedValue(contractBacktest()),
    runContractBacktest: vi.fn().mockResolvedValue(contractBacktest()),
    runContractTradingStrategyBacktest: vi.fn().mockResolvedValue(contractBacktest()),
  }
}

function mountPane(proxy: IBacktestProxy, replaysOnContractAccount: boolean) {
  return mount(TradingStrategyBacktestPane, {
    props: {
      backtestApplication: new BacktestApplication(new BacktestService(proxy)),
      // 合約標的清單認得 BTCUSDT；現貨那一份是空的，挑到它就代表挑錯了清單。
      tradingSymbolApplication: new TradingSymbolApplication(new TradingSymbolService(
        { findTradingSymbols: vi.fn().mockResolvedValue([]) },
        buildContractTradingSymbolProxy([buildContractTradingSymbol('BTCUSDT')]))),
      timeZone: buildTimeZone(),
      tradingStrategyId: 7,
      savedGeneration: 0,
      marketDataKind: replaysOnContractAccount ? 'contractKCandle' : 'kCandle',
      replaysOnContractAccount,
      tradingModeLabel: replaysOnContractAccount ? '只做多' : null,
    },
  })
}

describe('TradingStrategyBacktestPane 重演一份合約交易策略', () => {
  it('標的從合約標的清單挑，有槓桿與滑點，交易模式寫成由交易策略決定', async () => {
    const wrapper = mountPane(buildProxy(), true)
    await flushPromises()

    expect(wrapper.find('[data-testid="contract-symbol-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="symbol-select"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="backtest-leverage-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="backtest-slippage-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="backtest-contract-trading-mode-select"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="backtest-contract-trading-mode-note"]').text())
      .toBe('只做多（由這份交易策略決定，要換請改交易策略）')
  })

  it('送出的是合約交易策略重演，槓桿 3，不帶交易模式', async () => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy, true)
    await flushPromises()

    await wrapper.get('[data-testid="contract-symbol-select"]').setValue('BTCUSDT')
    await wrapper.get('[data-testid="backtest-leverage-input"]').setValue('3')
    await wrapper.get('[data-testid="backtest-slippage-input"]').setValue('0.05')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(proxy.runTradingStrategyBacktest).not.toHaveBeenCalled()
    const [requestDomain, termsDomain] = vi.mocked(proxy.runContractTradingStrategyBacktest).mock.calls[0]!
    expect(requestDomain.tradingStrategyId).toBe(7)
    expect(termsDomain.leverage.toString()).toBe('3')
    expect(termsDomain.slippagePercentage.toString()).toBe('0.05')
    expect(termsDomain.tradingMode).toBeNull()
  })

  it('一份 K 線交易策略的回測條件與這一刀之前一模一樣', async () => {
    const wrapper = mountPane(buildProxy(), false)
    await flushPromises()

    expect(wrapper.find('[data-testid="symbol-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="backtest-leverage-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="backtest-trading-mode-note"]').exists()).toBe(true)
  })
})
