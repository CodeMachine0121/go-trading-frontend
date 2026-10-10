import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import StrategyScriptBacktestPane from '~/components/organisms/StrategyScriptBacktestPane.vue'
import FormField from '~/components/molecules/FormField.vue'
import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import { BacktestApplication } from '~/application/backtest-application'
import { BacktestService } from '~/domain/service/backtest-service'
import { AggregationIntervalDomain } from '~/domain/models/domains/aggregation-interval-domain'
import type { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'
import { buildTimeZone } from '../../fixtures/time-zone'
import { buildBacktestRun, buildBacktestRunProxy } from '../../fixtures/backtest-run'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

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

function buildProxy(overrides: Partial<IBacktestProxy> = {}): IBacktestProxy {
  return {
    submitBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
    submitTradingStrategyBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
    submitContractBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
    submitContractTradingStrategyBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
    ...overrides,
  }
}

function mountPane(proxy: IBacktestProxy, replaysOnContractAccount: boolean) {
  return mount(StrategyScriptBacktestPane, {
    props: {
      backtestApplication: new BacktestApplication(new BacktestService(proxy, buildBacktestRunProxy())),
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

    expect(proxy.submitBacktest).not.toHaveBeenCalled()
    const termsDomain = vi.mocked(proxy.submitContractBacktest).mock.calls[0]![1]
    expect(termsDomain.leverage.toString()).toBe('5')
    expect(termsDomain.tradingMode).toBe('longOnly')
    expect(termsDomain.slippagePercentage.toString()).toBe('0.1')
  })

  it('合約策略腳本頁送出後說出輪次編號，列表最上面多一筆排隊中，鍵又按得下去', async () => {
    const wrapper = mountPane(buildProxy({
      submitContractBacktest: vi.fn().mockResolvedValue(buildBacktestRun({ id: 40, kind: 'contractScript' })),
    }), true)

    await submit(wrapper)

    expect(wrapper.get('[data-testid="backtest-submitted-alert"]').text()).toContain('已送出，輪次 #40')
    const rows = wrapper.findAll('[data-testid="backtest-run-row"]')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.text()).toContain('#40')
    expect(rows[0]!.get('[data-testid="backtest-run-status"]').text()).toBe('排隊中')
    expect(wrapper.get('[data-testid="run-backtest-button"]').attributes('disabled')).toBeUndefined()
  })

  it('槓桿與滑點留白時照樣送出，兩格都不算有填', async () => {
    const proxy = buildProxy()
    const wrapper = mountPane(proxy, true)

    await submit(wrapper)

    const termsDomain = vi.mocked(proxy.submitContractBacktest).mock.calls[0]![1]
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

    expect(proxy.submitContractBacktest).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain(message)
  })

  it('交易服務指名槓桿時，那句話落在槓桿那一格旁邊', async () => {
    const proxy = buildProxy({
      submitContractBacktest: vi.fn().mockRejectedValue(
        new BacktestFieldError('leverage', new UntranslatedTextVo('這個合約標的最高只能開 125 倍槓桿'))),
    })
    const wrapper = mountPane(proxy, true)

    await submit(wrapper)

    const leverageField = wrapper.findAllComponents(FormField)
      .find(field => field.props('label') === '槓桿倍數')
    expect(leverageField?.props('errorMessage')).toBe('這個合約標的最高只能開 125 倍槓桿')
  })
})
