import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import StrategyScriptBacktestPane from '~/components/organisms/StrategyScriptBacktestPane.vue'
import FormField from '~/components/molecules/FormField.vue'
import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import { BacktestApplication } from '~/application/backtest-application'
import { BacktestService } from '~/domain/service/backtest-service'
import {
  Backtest,
  ClosedTrade,
  ContractBacktestFigures,
  ContractTradeFigures,
  EquityPoint,
} from '~/domain/models/entities/backtest'
import { AggregationIntervalDomain } from '~/domain/models/domains/aggregation-interval-domain'
import type { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'
import { buildTimeZone } from '../../fixtures/time-zone'

const chartLibrary = vi.hoisted(() => ({
  createChart: vi.fn(() => ({
    addSeries: vi.fn(() => ({ setData: vi.fn(), applyOptions: vi.fn() })),
    applyOptions: vi.fn(),
    timeScale: vi.fn(() => ({ fitContent: vi.fn() })),
    remove: vi.fn(),
  })),
}))

vi.mock('lightweight-charts', () => ({
  createChart: chartLibrary.createChart,
  LineSeries: 'LineSeries',
}))

const REPLAY_START = new Date('2026-08-06T00:00:00Z')

/** 一次合約重演：一筆被強平的五倍空單，淨付出 18 的資金費用，用的是完整分級。 */
function contractBacktest(): Backtest {
  return new Backtest(
    'BTCUSDT', '1h', REPLAY_START, REPLAY_START, 2, new Decimal(10000), new Decimal(0),
    -1, 1, 0, 1, 0, 0, 0, new Decimal(0),
    [new ClosedTrade(
      'short', REPLAY_START, new Decimal(100), REPLAY_START, new Decimal('119.5'),
      new Decimal(10000), new Decimal(-10000), 'liquidation', new Decimal(0), new Decimal(0),
      new ContractTradeFigures(new Decimal(5), new Decimal(500), new Decimal(5)))],
    [new EquityPoint(REPLAY_START, new Decimal(10000))],
    new ContractBacktestFigures(
      'shortOnly', new Decimal(5), 1, new Decimal(18), 0, null, 1, 0, 0,
      'tiers', new Date('2026-09-01T00:00:00Z')))
}

function buildProxy(overrides: Partial<IBacktestProxy> = {}): IBacktestProxy {
  return {
    runBacktest: vi.fn().mockResolvedValue(contractBacktest()),
    runTradingStrategyBacktest: vi.fn().mockResolvedValue(contractBacktest()),
    runContractBacktest: vi.fn().mockResolvedValue(contractBacktest()),
    runContractTradingStrategyBacktest: vi.fn().mockResolvedValue(contractBacktest()),
    ...overrides,
  }
}

function mountPane(proxy: IBacktestProxy, replaysOnContractAccount: boolean) {
  return mount(StrategyScriptBacktestPane, {
    props: {
      backtestApplication: new BacktestApplication(new BacktestService(proxy)),
      tradingSymbolApplication: buildTradingSymbolApplication(),
      timeZone: buildTimeZone(),
      aggregationIntervalOptions: [new AggregationIntervalDomain('1h').toOptionDto()],
      script: 'return indicator.Buy',
      resultType: 'signal',
      parameters: [] as StrategyScriptParameterDto[],
      workspaceGeneration: 0,
      symbol: 'BTCUSDT',
      aggregationInterval: '1h',
      marketDataKind: replaysOnContractAccount ? 'contractKCandle' : 'kCandle',
      replaysOnContractAccount,
    },
  })
}

async function submit(wrapper: ReturnType<typeof mountPane>) {
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('StrategyScriptBacktestPane 在合約帳戶上重演', () => {
  it('現貨的回測沒有槓桿、交易模式、滑點三格，仍是那句只做現貨', () => {
    const wrapper = mountPane(buildProxy(), false)

    expect(wrapper.find('[data-testid="backtest-leverage-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="backtest-contract-trading-mode-select"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="backtest-slippage-input"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="backtest-trading-mode-note"]').text()).toContain('只做現貨')
  })

  it('送出的是一次合約重演，槓桿 5、只做多、滑點 0.1', async () => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy, true)

    await wrapper.get('[data-testid="backtest-leverage-input"]').setValue('5')
    await wrapper.get('[data-testid="backtest-contract-trading-mode-select"]').setValue('longOnly')
    await wrapper.get('[data-testid="backtest-slippage-input"]').setValue('0.1')
    await submit(wrapper)

    expect(proxy.runBacktest).not.toHaveBeenCalled()
    const termsDomain = vi.mocked(proxy.runContractBacktest).mock.calls[0]![1]
    expect(termsDomain.leverage.toString()).toBe('5')
    expect(termsDomain.tradingMode).toBe('longOnly')
    expect(termsDomain.slippagePercentage.toString()).toBe('0.1')
  })

  it('槓桿與滑點留白時照樣送出，兩格都不算有填', async () => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy, true)

    await submit(wrapper)

    const termsDomain = vi.mocked(proxy.runContractBacktest).mock.calls[0]![1]
    expect(termsDomain.leverageIsSet).toBe(false)
    expect(termsDomain.slippageIsSet).toBe(false)
    expect(termsDomain.tradingMode).toBe('longShort')
  })

  it.each([
    { testId: 'backtest-leverage-input', value: '0.5', message: '槓桿倍數不得小於 1 倍' },
    { testId: 'backtest-slippage-input', value: '-1', message: '滑點不得為負' },
  ])('$testId 填 $value 時不送出，旁邊寫「$message」', async ({ testId, value, message }) => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy, true)

    await wrapper.get(`[data-testid="${testId}"]`).setValue(value)
    await submit(wrapper)

    expect(proxy.runContractBacktest).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain(message)
  })

  it('交易服務指名槓桿時，那句話落在槓桿那一格旁邊', async () => {
    const proxy = buildProxy({
      runContractBacktest: vi.fn().mockRejectedValue(
        new BacktestFieldError('leverage', '這個合約標的最高只能開 125 倍槓桿')),
    })
    const wrapper = mountPane(proxy, true)

    await submit(wrapper)

    const leverageField = wrapper.findAllComponents(FormField)
      .find(field => field.props('label') === '槓桿倍數')
    expect(leverageField?.props('errorMessage')).toBe('這個合約標的最高只能開 125 倍槓桿')
  })

  it('成績單與明細說出合約帳戶的事', async () => {
    const wrapper = mountPane(buildProxy(), true)

    await submit(wrapper)

    expect(wrapper.get('[data-testid="summary-contract-trading-mode"]').text()).toBe('只做空')
    expect(wrapper.get('[data-testid="summary-liquidation-exit-count"]').text()).toBe('1')
    expect(wrapper.get('[data-testid="summary-total-funding-fee"]').text()).toBe('付出 18.00')
    expect(wrapper.get('[data-testid="summary-long-trades"]').text()).toContain('不適用')
    expect(wrapper.get('[data-testid="summary-blocked-opening-count"]').text()).toBe('0')
    expect(wrapper.get('[data-testid="summary-maintenance-margin-basis"]').text()).toContain('完整分級')
    expect(wrapper.find('[data-testid="summary-maintenance-margin-confirmed-at"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="summary-maintenance-margin-basis-note"]').text()).toContain('今天這一組')
    expect(wrapper.get('[data-testid="trade-exit-reason"]').text()).toBe('強平')
    expect(wrapper.get('[data-testid="trade-leverage"]').text()).toBe('5 倍')
    expect(wrapper.get('[data-testid="trade-quantity"]').text()).toBe('500')
    expect(wrapper.get('[data-testid="trade-margin"]').text()).toBe('10000.00')
    expect(wrapper.get('[data-testid="trade-funding-fee"]').text()).toBe('5.00')
  })
})
