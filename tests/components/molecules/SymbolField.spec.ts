import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SymbolField from '~/components/molecules/SymbolField.vue'
import { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import type { ITradingSymbolProxy } from '~/domain/interface/i-trading-symbol-proxy'
import { TradingSymbol } from '~/domain/models/entities/trading-symbol'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

// 只 mock 最外層的 proxy 介面；application、domain service 與 entity 都是真的。
function buildApplication(tradingSymbolProxy: ITradingSymbolProxy): TradingSymbolApplication {
  return new TradingSymbolApplication(new TradingSymbolService(tradingSymbolProxy))
}

function proxyListing(...symbols: string[]): ITradingSymbolProxy {
  return {
    findTradingSymbols: vi.fn().mockResolvedValue(symbols.map(symbol => new TradingSymbol(symbol))),
  }
}

async function mountField(tradingSymbolProxy: ITradingSymbolProxy, modelValue = 'BTCUSDT') {
  const wrapper = mount(SymbolField, {
    props: { modelValue, tradingSymbolApplication: buildApplication(tradingSymbolProxy) },
  })
  await flushPromises()

  return wrapper
}

function optionValues(wrapper: Awaited<ReturnType<typeof mountField>>): string[] {
  return wrapper.findAll('option').map(option => option.element.value)
}

describe('SymbolField', () => {
  it('把後端握有的每一檔列成可挑的選項，順序原樣沿用', async () => {
    const wrapper = await mountField(proxyListing('BTCUSDT', 'ETHUSDT', 'SOLUSDT'))

    expect(optionValues(wrapper)).toEqual(['BTCUSDT', 'ETHUSDT', 'SOLUSDT'])
  })

  it('挑另一檔就把它送回去', async () => {
    const wrapper = await mountField(proxyListing('BTCUSDT', 'ETHUSDT'))

    await wrapper.get('[data-testid="symbol-select"]').setValue('ETHUSDT')

    expect(wrapper.emitted('update:modelValue')).toEqual([['ETHUSDT']])
  })

  it('目前這一檔就在清單上時不做任何切換——即使它不是第一個', async () => {
    const wrapper = await mountField(proxyListing('ETHUSDT', 'BTCUSDT'), 'BTCUSDT')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('目前這一檔不在清單上時改選第一個', async () => {
    const wrapper = await mountField(proxyListing('ETHUSDT', 'SOLUSDT'), 'BTCUSDT')

    expect(wrapper.emitted('update:modelValue')).toEqual([['ETHUSDT']])
  })

  it('後端一檔都沒有時維持原本那一檔，並說明目前沒有任何交易標的', async () => {
    const wrapper = await mountField(proxyListing(), 'BTCUSDT')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.get('[data-testid="symbol-select"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('後端目前沒有任何交易標的')
    expect(optionValues(wrapper)).toEqual(['BTCUSDT'])
  })

  it('取不到清單時說明取不到，那一檔仍然看得見', async () => {
    const wrapper = await mountField({
      findTradingSymbols: vi.fn().mockRejectedValue(new BackendUnreachableError('/trading-symbols')),
    }, 'BTCUSDT')

    expect(wrapper.text()).toContain('取不到交易標的清單')
    expect(wrapper.get('[data-testid="symbol-select"]').attributes('disabled')).toBeDefined()
    expect(optionValues(wrapper)).toEqual(['BTCUSDT'])
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('清單還在路上時先說一聲', () => {
    const wrapper = mount(SymbolField, {
      props: {
        modelValue: 'BTCUSDT',
        tradingSymbolApplication: buildApplication({
          findTradingSymbols: vi.fn().mockReturnValue(new Promise(() => {})),
        }),
      },
    })

    expect(wrapper.text()).toContain('取交易標的清單中…')
  })

  it('欄位本身有錯時，把訊息標在欄位旁', async () => {
    const wrapper = mount(SymbolField, {
      props: {
        modelValue: 'BTCUSDT',
        tradingSymbolApplication: buildApplication(proxyListing('BTCUSDT')),
        errorMessage: '請指定交易標的',
      },
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="field-error"]').text()).toBe('請指定交易標的')
  })
})
