import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import StrategyScriptBacktestPane from '~/components/organisms/StrategyScriptBacktestPane.vue'
import TradingStrategyBacktestPane from '~/components/organisms/TradingStrategyBacktestPane.vue'
import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import { BacktestApplication } from '~/application/backtest-application'
import { BacktestService } from '~/domain/service/backtest-service'
import { AggregationIntervalDomain } from '~/domain/models/domains/aggregation-interval-domain'
import { BacktestTimeAllowanceSpentError } from '~/domain/errors/backtest-time-allowance-spent-error'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'
import { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'
import { buildContractTradingSymbol, buildContractTradingSymbolProxy } from '../../fixtures/contract-proxies'
import { buildTimeZone } from '../../fixtures/time-zone'
import { buildBacktestRun, buildBacktestRunProxy } from '../../fixtures/backtest-run'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

function buildProxy(): IBacktestProxy {
  return {
    submitBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
    submitTradingStrategyBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
    submitContractBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
    submitContractTradingStrategyBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
  }
}

function mountScriptPane(proxy: IBacktestProxy) {
  return mount(StrategyScriptBacktestPane, {
    props: {
      backtestApplication: new BacktestApplication(new BacktestService(proxy, buildBacktestRunProxy())),
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

    const [requestDomain] = vi.mocked(proxy.submitBacktest).mock.calls[0]!
    expect(requestDomain.fillTiming.value).toBe('nextOpen')
    expect(requestDomain.validationStartTime).toEqual(buildTimeZone().parseMinuteInput('2026-01-21T00:00'))
  })

  it('成交時點沒動、驗證起點留白時照今天一樣', async () => {
    const proxy = buildProxy()
    const wrapper = mountScriptPane(proxy)

    await submit(wrapper)

    const [requestDomain] = vi.mocked(proxy.submitBacktest).mock.calls[0]!
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

    expect(proxy.submitBacktest).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('驗證起點必須落在期間之內（晚於起點、早於終點）')
  })

  it('交易服務指名驗證起點時，那句話落在驗證起點那一格旁邊', async () => {
    const proxy = buildProxy()
    vi.mocked(proxy.submitBacktest).mockRejectedValue(
      new BacktestFieldError('validationStartTime', new UntranslatedTextVo('驗證段湊不出任何一格')))
    const wrapper = mountScriptPane(proxy)

    await fillStretch(wrapper, '2026-01-31T23:00')
    await submit(wrapper)

    const validationField = wrapper.get('[data-testid="backtest-validation-start-time-input"]').element
      .closest('label, div')?.parentElement
    expect(validationField?.textContent).toContain('驗證段湊不出任何一格')
  })

  it('沒在允許時間內跑完時說沒有成績單與下一步，不說成算式的問題', async () => {
    const proxy = buildProxy()
    vi.mocked(proxy.submitBacktest).mockRejectedValue(new BacktestTimeAllowanceSpentError('重演在 90 秒內沒跑完'))
    const wrapper = mountScriptPane(proxy)

    await submit(wrapper)

    const alert = wrapper.get('[data-testid="backtest-time-allowance-spent-alert"]').text()
    expect(alert).toContain('沒有成績單')
    expect(alert).toContain('縮短期間')
    expect(alert).toContain('粗一點的彙總刻度')
    expect(wrapper.find('[data-testid="backtest-script-failed-alert"]').exists()).toBe(false)
  })
})

describe('短線回測條件（重演一份合約交易策略）', () => {
  it('也有成交時點與驗證起點兩格，並一起送出', async () => {
    const proxy = buildProxy()
    const wrapper = mount(TradingStrategyBacktestPane, {
      props: {
        backtestApplication: new BacktestApplication(new BacktestService(proxy, buildBacktestRunProxy())),
        tradingSymbolApplication: new TradingSymbolApplication(new TradingSymbolService(
          { findTradingSymbols: vi.fn().mockResolvedValue([]) },
          buildContractTradingSymbolProxy([buildContractTradingSymbol('BTCUSDT')]))),
        timeZone: buildTimeZone(),
        tradingStrategyId: 7,
        savedGeneration: 0,
        marketDataKind: 'contractKCandle',
        replaysOnContractAccount: true,
        tradingModeLabel: new LocalizedTextVo('只做多', 'Long only'),
      },
    })
    await flushPromises()

    await wrapper.get('[data-testid="contract-symbol-select"]').setValue('BTCUSDT')
    await wrapper.get('[data-testid="backtest-fill-timing-select"]').setValue('nextOpen')
    await fillStretch(wrapper, '2026-01-21T00:00')
    await submit(wrapper)

    const [requestDomain] = vi.mocked(proxy.submitContractTradingStrategyBacktest).mock.calls[0]!
    expect(requestDomain.fillTiming.value).toBe('nextOpen')
    expect(requestDomain.validationStartTime).not.toBeNull()
  })
})
