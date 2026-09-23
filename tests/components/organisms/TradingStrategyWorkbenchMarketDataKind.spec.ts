// @vitest-environment nuxt
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TradingStrategyWorkbench from '~/components/organisms/TradingStrategyWorkbench.vue'
import { TradingStrategyConditionDto } from '~/domain/models/dto/trading-strategy-condition-dto'
import { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import { TradingStrategySignalSourceDto } from '~/domain/models/dto/trading-strategy-signal-source-dto'
import { TradingStrategyService } from '~/domain/service/trading-strategy-service'
import type { ITradingStrategyProxy } from '~/domain/interface/i-trading-strategy-proxy'
import { onADesktop } from '../../fixtures/layout-density'

const optionsService = new TradingStrategyService({} as ITradingStrategyProxy)

function storedStrategy(marketDataKind: 'kCandle' | 'contractKCandle') {
  const contract = marketDataKind === 'contractKCandle'

  return new TradingStrategyDto(
    7, contract ? '費率反轉' : '均線交叉',
    [new TradingStrategySignalSourceDto('A', contract ? 21 : 9, '1h', [])],
    new TradingStrategyConditionDto('b', null, [], 'A', 'buy'),
    new TradingStrategyConditionDto('s', null, [], 'A', 'sell'),
    marketDataKind, contract ? '合約行情' : 'K 線',
    contract ? 'shortOnly' : null, contract ? '只做空' : null, contract, !contract)
}

function mountWorkbench(editing: TradingStrategyDto | null) {
  return mount(TradingStrategyWorkbench, {
    props: {
      editing,
      strategyScriptOptionsByKind: {
        kCandle: [{ value: 9, label: '均線' }],
        contractKCandle: [{ value: 21, label: '費率反轉' }],
      },
      parameterNamesByStrategyScriptId: {},
      unusableStrategyScriptsByKind: { kCandle: {}, contractKCandle: {} },
      shortageByKind: { kCandle: null, contractKCandle: null },
      marketDataKindOptions: optionsService.listMarketDataKindOptions(),
      contractTradingModeOptions: optionsService.listContractTradingModeOptions(),
      saving: false,
      failureMessage: '',
      savedGeneration: 0,
      layoutDensity: onADesktop(),
    },
    global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  })
}

describe('TradingStrategyWorkbench 的行情種類與交易模式', () => {
  it('新拼一份時選得動行情種類，預設是 K 線，沒有交易模式那一格', () => {
    const wrapper = mountWorkbench(null)

    const kindSelect = wrapper.get('[data-testid="trading-strategy-market-data-kind-select"]')
    expect((kindSelect.element as HTMLSelectElement).value).toBe('kCandle')
    expect(wrapper.find('[data-testid="trading-strategy-trading-mode-select"]').exists()).toBe(false)
  })

  it('選了合約行情就多出交易模式，預設多空反手，並說出買入賣出各是什麼', async () => {
    const wrapper = mountWorkbench(null)

    await wrapper.get('[data-testid="trading-strategy-market-data-kind-select"]').setValue('contractKCandle')

    const modeSelect = wrapper.get('[data-testid="trading-strategy-trading-mode-select"]')
    expect((modeSelect.element as HTMLSelectElement).value).toBe('longShort')
    expect(wrapper.get('[data-testid="trading-strategy-trading-mode-description"]').text()).toContain('反手')
  })

  it('已存的 K 線交易策略寫出它是 K 線且換不了，沒有交易模式那一格', () => {
    const wrapper = mountWorkbench(storedStrategy('kCandle'))

    expect(wrapper.find('[data-testid="trading-strategy-market-data-kind-select"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="trading-strategy-market-data-kind-locked"]').text()).toContain('K 線')
    expect(wrapper.find('[data-testid="trading-strategy-trading-mode-select"]').exists()).toBe(false)
  })

  it('已存的合約交易策略照它存的交易模式打開，存的時候帶著它改過的模式', async () => {
    const wrapper = mountWorkbench(storedStrategy('contractKCandle'))

    const modeSelect = wrapper.get('[data-testid="trading-strategy-trading-mode-select"]')
    expect((modeSelect.element as HTMLSelectElement).value).toBe('shortOnly')

    await modeSelect.setValue('longOnly')
    await wrapper.get('[data-testid="trading-strategy-form-save"]').trigger('click')

    const saved = wrapper.emitted('save')?.at(-1)?.[0] as { marketDataKind: string, tradingMode: string | null }
    expect(saved.marketDataKind).toBe('contractKCandle')
    expect(saved.tradingMode).toBe('longOnly')
  })

  it('新拼的那一份加過來源之後換了行情種類，來源被拿掉並說明為什麼', async () => {
    const wrapper = mountWorkbench(null)

    await wrapper.get('[data-testid="strategy-script-add"]').trigger('click')
    await wrapper.get('[data-testid="trading-strategy-market-data-kind-select"]').setValue('contractKCandle')

    expect(wrapper.get('[data-testid="trading-strategy-market-data-kind-notice"]').text())
      .toContain('原本的信號來源吃的是另一種行情，已經拿掉')
  })
})
