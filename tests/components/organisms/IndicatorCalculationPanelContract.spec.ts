import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import IndicatorCalculationPanel from '~/components/organisms/IndicatorCalculationPanel.vue'
import ContractSymbolField from '~/components/molecules/ContractSymbolField.vue'
import SymbolField from '~/components/molecules/SymbolField.vue'
import { IndicatorCalculationApplication } from '~/application/indicator-calculation-application'
import { IndicatorCalculationService } from '~/domain/service/indicator-calculation-service'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import type { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'
import type { IStrategyScriptProxy } from '~/domain/interface/i-strategy-script-proxy'
import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { IndicatorCalculationFieldError } from '~/domain/errors/indicator-calculation-field-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'
import {
  buildStrategyScriptMarketplaceApplication,
  buildStrategyScriptApplication,
  buildStoredStrategyScript,
  buildAdoptedStrategyScript,
} from '../../fixtures/strategy-script-application'
import { buildContractTradingSymbol, buildContractTradingSymbolProxy } from '../../fixtures/contract-proxies'
import { buildBacktestApplication } from '../../fixtures/backtest-application'
import { buildTimeZone } from '../../fixtures/time-zone'

// 只 mock 最外層的 proxy 介面；application、domain service 與 domain model 都是真的。

/** 算式內容住在編輯區裡，而編輯區是掛載後才動態載入的，microtask 還輪不到它。 */
async function settle() {
  await new Promise(resolve => setTimeout(resolve, 20))
  await flushPromises()
}

function mountPanel(
  options: {
    marketDataKind?: MarketDataKind
    strategyScriptProxy?: Partial<IStrategyScriptProxy>
    calculateIndicator?: IIndicatorCalculationProxy['calculateIndicator']
  } = {},
) {
  return mount(IndicatorCalculationPanel, {
    props: {
      indicatorCalculationApplication: new IndicatorCalculationApplication(
        new IndicatorCalculationService({
          calculateIndicator: options.calculateIndicator
            ?? vi.fn().mockResolvedValue(new IndicatorCalculation('BTCUSDT', '1m', 3, 'float', [])),
          recalculateIndicator: vi.fn(),
        })),
      strategyScriptMarketplaceApplication: buildStrategyScriptMarketplaceApplication(),
      strategyScriptApplication: buildStrategyScriptApplication(options.strategyScriptProxy ?? {}),
      tradingSymbolApplication: new TradingSymbolApplication(new TradingSymbolService(
        { findTradingSymbols: vi.fn().mockResolvedValue([]) },
        buildContractTradingSymbolProxy([
          buildContractTradingSymbol('BTCUSDT'), buildContractTradingSymbol('ETHUSDT')]))),
      backtestApplication: buildBacktestApplication(),
      timeZone: buildTimeZone(),
      ...(options.marketDataKind === undefined ? {} : { marketDataKind: options.marketDataKind }),
    },
  })
}

function mountContractPanel(options: Omit<Parameters<typeof mountPanel>[0], 'marketDataKind'> = {}) {
  return mountPanel({ ...options, marketDataKind: 'contractKCandle' })
}

function scriptText(wrapper: ReturnType<typeof mountPanel>): string {
  return wrapper.get('[data-testid="script"]').element
    .querySelector('.cm-content')?.textContent ?? ''
}

/** 從畫面上把整份算式換掉——走的是使用者真正會走的那條路。 */
async function typeScript(wrapper: ReturnType<typeof mountPanel>, script: string) {
  await settle()
  const content = wrapper.get('[data-testid="script"]').element.querySelector('.cm-content')
  if (content === null) {
    throw new Error('編輯區還沒準備好')
  }

  content.textContent = script
  content.dispatchEvent(new Event('input', { bubbles: true }))
  await settle()
}

const CONTRACT_SCRIPT = 'package main\n\nimport "indicator"\n\n'
  + 'func Calculate(data []indicator.ContractKCandle) map[string]float64 { return nil }'

describe('合約策略腳本的工作區', () => {
  it('只有指標預覽：沒有回測分頁，也沒有回測那顆執行鍵', async () => {
    const wrapper = mountContractPanel()
    await settle()

    expect(wrapper.text()).not.toContain('回測')
    expect(wrapper.find('[data-testid="run-backtest-button"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="calculate-button"]')).toHaveLength(1)
  })

  it('標的從合約標的清單挑，不是現貨那一份', async () => {
    const wrapper = mountContractPanel()
    await settle()

    expect(wrapper.findComponent(ContractSymbolField).exists()).toBe(true)
    expect(wrapper.findComponent(SymbolField).exists()).toBe(false)
  })

  it('空白算式的進入點收一串合約行情格', async () => {
    const wrapper = mountContractPanel()
    await settle()

    expect(scriptText(wrapper)).toContain('func Calculate(data []indicator.ContractKCandle) map[string]float64 {')
  })

  it('改成信號時，進入點仍收合約行情格', async () => {
    const wrapper = mountContractPanel()
    await settle()

    await wrapper.get('[data-testid="result-type-select"]').setValue('signal')
    await settle()

    expect(scriptText(wrapper)).toContain('func Calculate(data []indicator.ContractKCandle) indicator.Signal {')
  })

  it('帶入的範例讀的是合約才有的東西', async () => {
    const wrapper = mountContractPanel()
    await settle()

    await wrapper.get('[data-testid="example-button"]').trigger('click')
    await settle()

    expect(scriptText(wrapper)).toContain('[]indicator.ContractKCandle')
    expect(scriptText(wrapper)).toContain('FundingRate')
  })

  it('「算式裡可以用什麼」說的是合約行情格，並明講沒有值的一律是零', async () => {
    const wrapper = mountContractPanel()
    await settle()

    await wrapper.get('[data-testid="script-guide-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="script-entry-point"]').text())
      .toBe('func Calculate(data []indicator.ContractKCandle)')
    const fieldNames = wrapper.findAll('[data-testid="k-candle-field"]').map(field => field.text())
    expect(fieldNames).toEqual(expect.arrayContaining(['FundingRate', 'FundingSettledInBar', 'OpenInterest', 'Mark']))
    expect(wrapper.findAll('[data-testid="script-input-note"]').map(note => note.text()).join(''))
      .toContain('沒有值的一律是零')
  })

  it('現貨那一頁的說明一字不差：只列 K 線的那十項，沒有額外提醒', async () => {
    const wrapper = mountPanel()
    await settle()

    await wrapper.get('[data-testid="script-guide-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="script-entry-point"]').text()).toBe('func Calculate(data []indicator.KCandle)')
    expect(wrapper.findAll('[data-testid="k-candle-field"]')).toHaveLength(10)
    expect(wrapper.findAll('[data-testid="script-input-note"]')).toHaveLength(0)
  })

  it('清單只列合約行情種類的，自己的與加入的都是', async () => {
    const wrapper = mountContractPanel({
      strategyScriptProxy: {
        listAvailableStrategyScripts: vi.fn().mockResolvedValue({
          mine: [
            buildStoredStrategyScript(1, '均線'),
            buildStoredStrategyScript(2, '費率反轉', { marketDataKind: 'contractKCandle' }),
          ],
          adopted: [
            buildAdoptedStrategyScript(3, '別人的均線'),
            buildAdoptedStrategyScript(4, '別人的 OI 背離', { marketDataKind: 'contractKCandle' }),
          ],
        }),
      },
    })
    await settle()

    const options = wrapper.findAll('[data-testid="strategy-script-picker-select"] option').map(option => option.text())
    expect(options.join('|')).toContain('費率反轉')
    expect(options.join('|')).toContain('別人的 OI 背離')
    expect(options.join('|')).not.toContain('均線')
  })

  it('現貨那一頁的清單不列合約行情種類的', async () => {
    const wrapper = mountPanel({
      strategyScriptProxy: {
        listAvailableStrategyScripts: vi.fn().mockResolvedValue({
          mine: [
            buildStoredStrategyScript(1, '均線'),
            buildStoredStrategyScript(2, '費率反轉', { marketDataKind: 'contractKCandle' }),
          ],
          adopted: [],
        }),
      },
    })
    await settle()

    const options = wrapper.findAll('[data-testid="strategy-script-picker-select"] option').map(option => option.text())
    expect(options.join('|')).toContain('均線')
    expect(options.join('|')).not.toContain('費率反轉')
  })

  it('在這一頁存下的是合約行情種類', async () => {
    const createStrategyScript = vi.fn().mockResolvedValue(
      buildStoredStrategyScript(9, 'OI 背離', { marketDataKind: 'contractKCandle' }))
    const wrapper = mountContractPanel({ strategyScriptProxy: { createStrategyScript } })
    await typeScript(wrapper, CONTRACT_SCRIPT)

    await wrapper.get('[data-testid="save-as-strategy-script-button"]').trigger('click')
    await wrapper.get('[data-testid="strategy-script-name-input"]').setValue('OI 背離')
    await wrapper.get('[data-testid="strategy-script-name-submit"]').trigger('click')
    await settle()

    expect(createStrategyScript).toHaveBeenCalledOnce()
    expect(createStrategyScript.mock.calls[0]?.[0].marketDataKind).toBe('contractKCandle')
  })

  it('存下的那一支出現在這一頁的清單上', async () => {
    const saved = buildStoredStrategyScript(9, 'OI 背離', { marketDataKind: 'contractKCandle' })
    const listAvailableStrategyScripts = vi.fn()
      .mockResolvedValueOnce({ mine: [], adopted: [] })
      .mockResolvedValue({ mine: [saved], adopted: [] })
    const wrapper = mountContractPanel({
      strategyScriptProxy: { createStrategyScript: vi.fn().mockResolvedValue(saved), listAvailableStrategyScripts },
    })
    await typeScript(wrapper, CONTRACT_SCRIPT)

    await wrapper.get('[data-testid="save-as-strategy-script-button"]').trigger('click')
    await wrapper.get('[data-testid="strategy-script-name-input"]').setValue('OI 背離')
    await wrapper.get('[data-testid="strategy-script-name-submit"]').trigger('click')
    await settle()

    const options = wrapper.findAll('[data-testid="strategy-script-picker-select"] option').map(option => option.text())
    expect(options.join('|')).toContain('OI 背離')
    expect(wrapper.get<HTMLSelectElement>('[data-testid="strategy-script-picker-select"]').element.value).toBe('9')
  })

  it('改寫一支合約行情種類的，送出去的仍是合約行情', async () => {
    const stored = buildStoredStrategyScript(9, '費率反轉', { marketDataKind: 'contractKCandle', script: CONTRACT_SCRIPT })
    const updateStrategyScript = vi.fn().mockResolvedValue(stored)
    const wrapper = mountContractPanel({
      strategyScriptProxy: {
        listAvailableStrategyScripts: vi.fn().mockResolvedValue({ mine: [stored], adopted: [] }),
        updateStrategyScript,
      },
    })
    await settle()
    await wrapper.get('[data-testid="strategy-script-picker-select"]').setValue('9')
    await settle()

    await wrapper.get('[data-testid="save-strategy-script-button"]').trigger('click')
    await settle()

    expect(updateStrategyScript).toHaveBeenCalledOnce()
    expect(updateStrategyScript.mock.calls[0]?.[0].marketDataKind).toBe('contractKCandle')
  })

  it('在現貨那一頁存下的是 K 線種類', async () => {
    const createStrategyScript = vi.fn().mockResolvedValue(buildStoredStrategyScript(9, '新均線'))
    const wrapper = mountPanel({ strategyScriptProxy: { createStrategyScript } })
    await typeScript(wrapper, 'sum := 0.0')

    await wrapper.get('[data-testid="save-as-strategy-script-button"]').trigger('click')
    await wrapper.get('[data-testid="strategy-script-name-input"]').setValue('新均線')
    await wrapper.get('[data-testid="strategy-script-name-submit"]').trigger('click')
    await settle()

    expect(createStrategyScript.mock.calls[0]?.[0].marketDataKind).toBe('kCandle')
  })

  it('執行計算時算的是合約，挑的是合約標的', async () => {
    const calculateIndicator = vi.fn().mockResolvedValue(new IndicatorCalculation('BTCUSDT', '1m', 3, 'float', []))
    const wrapper = mountContractPanel({ calculateIndicator })
    await typeScript(wrapper, CONTRACT_SCRIPT)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(calculateIndicator).toHaveBeenCalledOnce()
    const request = calculateIndicator.mock.calls[0]?.[0] as IndicatorCalculationRequestDomain
    expect(request.marketDataKind.value).toBe('contractKCandle')
    expect(request.symbol).toBe('BTCUSDT')
    expect(wrapper.get('[data-testid="used-candle-count"]').text()).toContain('實際採用 3 根')
    expect(wrapper.get('[data-testid="used-interval"]').text()).toContain('一分鐘')
    expect(wrapper.get('[data-testid="used-candle-count"]').text()).toContain('一個數字')
  })

  it('交易服務說這支吃的是 K 線時，照那句話呈現為請求的問題', async () => {
    const wrapper = mountContractPanel({
      calculateIndicator: vi.fn().mockRejectedValue(new BackendRequestRejectedError('這支策略腳本吃的是 K 線，不能拿來做這一種指標計算', { status: 400 })),
    })
    await typeScript(wrapper, CONTRACT_SCRIPT)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="request-rejected-alert"]').text()).toContain('這支策略腳本吃的是 K 線')
  })

  it('照現貨寫法的進入點，照交易服務的話呈現為算式的問題', async () => {
    const wrapper = mountContractPanel({
      calculateIndicator: vi.fn().mockRejectedValue(new IndicatorScriptFailedError('Calculate 的形式必須是 func Calculate(data []indicator.ContractKCandle) map[string]float64')),
    })
    await typeScript(wrapper, CONTRACT_SCRIPT)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="script-failed-alert"]').text()).toContain('[]indicator.ContractKCandle')
  })

  it('湊不出最少可算根數時，與現貨同一句話，落在「要看多長」旁邊', async () => {
    const wrapper = mountContractPanel({
      calculateIndicator: vi.fn().mockRejectedValue(new IndicatorCalculationFieldError('span', '可用的只有 12 根，這支策略腳本至少要 20 根')),
    })
    await typeScript(wrapper, CONTRACT_SCRIPT)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('可用的只有 12 根，這支策略腳本至少要 20 根')
    expect(wrapper.find('[data-testid="request-rejected-alert"]').exists()).toBe(false)
  })

  it.each([
    { name: '連不上交易服務', failure: new BackendUnreachableError('連不上'), alert: 'unreachable-alert' },
    { name: '交易服務出錯', failure: new BackendServerError('壞了', { status: 502 }), alert: 'server-error-alert' },
  ])('$name 時與現貨同一種呈現，並給重試', async ({ failure, alert }) => {
    const wrapper = mountContractPanel({ calculateIndicator: vi.fn().mockRejectedValue(failure) })
    await typeScript(wrapper, CONTRACT_SCRIPT)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find(`[data-testid="${alert}"]`).exists()).toBe(true)
    expect(wrapper.get(`[data-testid="${alert}"]`).text()).toContain('重試')
  })
})
