import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ContractSymbolField from '~/components/molecules/ContractSymbolField.vue'
import { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import type { IContractTradingSymbolProxy } from '~/domain/interface/i-contract-trading-symbol-proxy'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import {
  buildContractTradingSymbol, buildContractTradingSymbolProxy,
} from '../../fixtures/contract-proxies'

// 只 mock 最外層的 proxy 介面；application、domain service 與 domain model 都是真的。
function buildApplication(contractTradingSymbolProxy: IContractTradingSymbolProxy): TradingSymbolApplication {
  return new TradingSymbolApplication(new TradingSymbolService(
    { findTradingSymbols: vi.fn() }, contractTradingSymbolProxy))
}

async function mountField(contractTradingSymbolProxy: IContractTradingSymbolProxy, modelValue = 'BTCUSDT') {
  const wrapper = mount(ContractSymbolField, {
    props: {
      'modelValue': modelValue,
      'tradingSymbolApplication': buildApplication(contractTradingSymbolProxy),
      'onUpdate:modelValue': (value: string) => wrapper.setProps({ modelValue: value }),
    },
  })
  await flushPromises()

  return wrapper
}

function optionTexts(wrapper: Awaited<ReturnType<typeof mountField>>): string[] {
  return wrapper.get('[data-testid="contract-symbol-select"]').findAll('option').map(option => option.text())
}

describe('ContractSymbolField', () => {
  it('清單上的都能挑，預設那一個先選著；沒在追蹤的也列著', async () => {
    const wrapper = await mountField(buildContractTradingSymbolProxy([
      buildContractTradingSymbol('BTCUSDT'), buildContractTradingSymbol('ETHUSDT', false),
    ]))

    expect(optionTexts(wrapper)).toEqual(['BTCUSDT', 'ETHUSDT（未追蹤）'])
    expect(wrapper.get<HTMLSelectElement>('[data-testid="contract-symbol-select"]').element.value).toBe('BTCUSDT')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('預設那一個不在清單上時改選清單上的第一個', async () => {
    const wrapper = await mountField(buildContractTradingSymbolProxy([
      buildContractTradingSymbol('ETHUSDT'), buildContractTradingSymbol('SOLUSDT'),
    ]))

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['ETHUSDT'])
    expect(optionTexts(wrapper)).toEqual(['ETHUSDT', 'SOLUSDT'])
  })

  it('一個都沒有時說要先加進合約追蹤名單，欄位維持原樣', async () => {
    const wrapper = await mountField(buildContractTradingSymbolProxy([]))

    expect(wrapper.text()).toContain('目前沒有任何合約標的，先把合約加進合約追蹤名單')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(optionTexts(wrapper)).toEqual(['BTCUSDT'])
  })

  it('清單取不到時說取不到，目前那一個照樣顯示', async () => {
    const wrapper = await mountField({
      findContractTradingSymbols: vi.fn().mockRejectedValue(new BackendUnreachableError('/contract-trading-symbols')),
    })

    expect(wrapper.text()).toContain('取不到合約標的清單，請確認後端已啟動')
    expect(optionTexts(wrapper)).toEqual(['BTCUSDT'])
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('清單還在路上時說正在取', () => {
    const wrapper = mount(ContractSymbolField, {
      props: {
        modelValue: 'BTCUSDT',
        tradingSymbolApplication: buildApplication({
          findContractTradingSymbols: vi.fn().mockReturnValue(new Promise(() => {})),
        }),
      },
    })

    expect(wrapper.text()).toContain('取合約標的清單中…')
    // 清單還在路上時，預設那一個照樣顯示著
    expect(wrapper.get<HTMLSelectElement>('[data-testid="contract-symbol-select"]').element.value).toBe('BTCUSDT')
  })

  it('錯誤訊息標在這一格旁', async () => {
    const wrapper = mount(ContractSymbolField, {
      props: {
        modelValue: '',
        errorMessage: '請指定交易標的',
        tradingSymbolApplication: buildApplication(buildContractTradingSymbolProxy([])),
      },
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="field-error"]').text()).toBe('請指定交易標的')
    expect(optionTexts(wrapper)).toEqual(['（沒有可選的合約）'])
  })
})

describe('ContractSymbolField 只列追蹤中的、而且改一台已存的機器人時', () => {
  async function mountWatchedOnly(keepsSelection: boolean, modelValue: string) {
    const wrapper = mount(ContractSymbolField, {
      props: {
        'modelValue': modelValue,
        'tradingSymbolApplication': buildApplication(buildContractTradingSymbolProxy([
          buildContractTradingSymbol('BTCUSDT'), buildContractTradingSymbol('ETHUSDT', false),
        ])),
        'watchedOnly': true,
        keepsSelection,
        'onUpdate:modelValue': (value: string) => wrapper.setProps({ modelValue: value }),
      },
    })
    await flushPromises()

    return wrapper
  }

  it('它盯的合約已被移出追蹤名單：仍選著它、標出不在名單上，不悄悄換成別的合約', async () => {
    const wrapper = await mountWatchedOnly(true, 'ETHUSDT')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.get<HTMLSelectElement>('[data-testid="contract-symbol-select"]').element.value).toBe('ETHUSDT')
    expect(optionTexts(wrapper)).toEqual(['ETHUSDT（不在合約追蹤名單上）', 'BTCUSDT'])
  })

  it('新拼一台時照舊改選第一個追蹤中的合約', async () => {
    const wrapper = await mountWatchedOnly(false, 'ETHUSDT')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['BTCUSDT'])
  })
})
