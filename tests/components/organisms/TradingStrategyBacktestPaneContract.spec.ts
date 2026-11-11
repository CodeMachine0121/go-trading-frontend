import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import TradingStrategyBacktestPane from '~/components/organisms/TradingStrategyBacktestPane.vue'
import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import { BacktestApplication } from '~/application/backtest-application'
import { BacktestService } from '~/domain/service/backtest-service'
import { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import { buildContractTradingSymbol, buildContractTradingSymbolProxy } from '../../fixtures/contract-proxies'
import { buildTimeZone } from '../../fixtures/time-zone'
import { buildBacktestRun, buildBacktestRunProxy } from '../../fixtures/backtest-run'

vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => ({
    addSeries: vi.fn(() => ({ setData: vi.fn(), applyOptions: vi.fn() })),
    applyOptions: vi.fn(),
    timeScale: vi.fn(() => ({ fitContent: vi.fn() })),
    remove: vi.fn(),
  })),
  LineSeries: 'LineSeries',
}))

function buildProxy(): IBacktestProxy {
  return {
    submitBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
    submitTradingStrategyBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
    submitContractBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
    submitContractTradingStrategyBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
  }
}

function mountPane(proxy: IBacktestProxy, replaysOnContractAccount: boolean) {
  return mount(TradingStrategyBacktestPane, {
    props: {
      backtestApplication: new BacktestApplication(new BacktestService(proxy, buildBacktestRunProxy())),
      // 合約標的清單認得 BTCUSDT；現貨那一份是空的，挑到它就代表挑錯了清單。
      tradingSymbolApplication: new TradingSymbolApplication(new TradingSymbolService(
        { findTradingSymbols: vi.fn().mockResolvedValue([]) },
        buildContractTradingSymbolProxy([buildContractTradingSymbol('BTCUSDT')]))),
      timeZone: buildTimeZone(),
      tradingStrategyId: 7,
      savedGeneration: 0,
      marketDataKind: replaysOnContractAccount ? 'contractKCandle' : 'kCandle',
      replaysOnContractAccount,
    },
  })
}

describe('TradingStrategyBacktestPane 重演一份合約交易策略', () => {
  it('標的從合約標的清單挑，有槓桿、滑點與交易模式選單，交易模式預設多空反手', async () => {
    const wrapper = mountPane(buildProxy(), true)
    await flushPromises()

    expect(wrapper.find('[data-testid="contract-symbol-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="symbol-select"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="backtest-leverage-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="backtest-slippage-input"]').exists()).toBe(true)
    const modeSelect = wrapper.get('[data-testid="backtest-contract-trading-mode-select"]')
    expect((modeSelect.element as HTMLSelectElement).value).toBe('longShort')
  })

  it('挑只做空時那一格說明只做空的買賣，送出的這一次帶著只做空', async () => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy, true)
    await flushPromises()

    await wrapper.get('[data-testid="contract-symbol-select"]').setValue('BTCUSDT')
    await wrapper.get('[data-testid="backtest-contract-trading-mode-select"]').setValue('shortOnly')
    expect(wrapper.text()).toContain('賣出：空手開空。買入：持空倉就平掉，空手時什麼都不做。')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const [, termsDomain] = vi.mocked(proxy.submitContractTradingStrategyBacktest).mock.calls[0]!
    expect(termsDomain.tradingMode).toBe('shortOnly')
  })

  it('送出的是合約交易策略重演，槓桿 3，交易模式沒動就是多空反手', async () => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy, true)
    await flushPromises()

    await wrapper.get('[data-testid="contract-symbol-select"]').setValue('BTCUSDT')
    await wrapper.get('[data-testid="backtest-leverage-input"]').setValue('3')
    await wrapper.get('[data-testid="backtest-slippage-input"]').setValue('0.05')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(proxy.submitTradingStrategyBacktest).not.toHaveBeenCalled()
    const [requestDomain, termsDomain] = vi.mocked(proxy.submitContractTradingStrategyBacktest).mock.calls[0]!
    expect(requestDomain.tradingStrategyId).toBe(7)
    expect(termsDomain.leverage.toString()).toBe('3')
    expect(termsDomain.slippagePercentage.toString()).toBe('0.05')
    expect(termsDomain.tradingMode).toBe('longShort')
  })

  it('一份 K 線交易策略沒有交易模式那一格，送出走現貨重演、不帶交易模式', async () => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy, false)
    await flushPromises()

    expect(wrapper.find('[data-testid="symbol-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="backtest-leverage-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="backtest-contract-trading-mode-select"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="backtest-trading-mode-note"]').exists()).toBe(true)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(proxy.submitContractTradingStrategyBacktest).not.toHaveBeenCalled()
  })
})

describe('TradingStrategyBacktestPane 切成英文', () => {
  it('交易模式選項、彙總刻度那一句與規則說明的標題都說英文', async () => {
    const wrapper = mountPane(buildProxy(), true)
    await flushPromises()

    wrapper.vm.$i18n.locale = 'en'
    await nextTick()

    expect(wrapper.get('[data-testid="backtest-contract-trading-mode-select"]').text()).toContain('Short only')
    expect(wrapper.get('[data-testid="backtest-aggregation-interval-note"]').text())
      .toBe('Set by this trading strategy\'s signal sources — this version requires them to agree')
    expect(wrapper.get('[data-testid="backtest-contract-account-note"]').text())
      .toContain('An isolated-margin contract account')
  })
})
