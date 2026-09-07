import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SymbolField from '~/components/molecules/SymbolField.vue'
import { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import type { ITradingSymbolProxy } from '~/domain/interface/i-trading-symbol-proxy'
import { buildTradingSymbol } from '~~/tests/fixtures/trading-symbol-application'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

// 只 mock 最外層的 proxy 介面；application、domain service 與 entity 都是真的。
function buildApplication(tradingSymbolProxy: ITradingSymbolProxy): TradingSymbolApplication {
  return new TradingSymbolApplication(new TradingSymbolService(tradingSymbolProxy))
}

function proxyListing(...symbols: string[]): ITradingSymbolProxy {
  return {
    findTradingSymbols: vi.fn().mockResolvedValue(symbols.map(symbol => buildTradingSymbol(symbol))),
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

describe('SymbolField 的市場篩選', () => {
  function proxyListingMarkets(): ITradingSymbolProxy {
    return {
      findTradingSymbols: vi.fn().mockResolvedValue([
        buildTradingSymbol('2330', { market: 'taiwanStock' }),
        buildTradingSymbol('2454', { market: 'taiwanStock', hasLiveUpdates: false }),
        buildTradingSymbol('BTCUSDT', { market: 'crypto' }),
      ]),
    }
  }

  it('挑之前就看得出每一檔屬於哪個市場', async () => {
    // 挑完才回頭理解畫面為什麼長這樣，比挑之前就知道貴得多。
    const wrapper = await mountField(proxyListingMarkets())

    expect(wrapper.find('[data-testid="symbol-select"]').text()).toContain('台股')
    expect(wrapper.find('[data-testid="symbol-select"]').text()).toContain('加密貨幣')
  })

  it('挑之前就看得出哪一檔沒有即時更新', async () => {
    // 挑完才發現這一檔不會動，那個資訊就來得太晚了。
    const wrapper = await mountField(proxyListingMarkets())

    expect(wrapper.find('[data-testid="symbol-select"]').text()).toContain('無即時更新')
  })

  it('只看某一個市場時，其餘的不再列出', async () => {
    const wrapper = await mountField(proxyListingMarkets(), '2330')

    await wrapper.find('[data-testid="tab-taiwanStock"]').trigger('click')

    const optionValues = wrapper.findAll('option').map(option => option.element.value)
    expect(optionValues).toEqual(['2330', '2454'])
  })

  it('換到別的市場就換到那個市場的第一檔，不留著上一個市場的那一檔', async () => {
    // 留著它，分頁寫著台股、圖上畫的卻是比特幣——畫面在說謊。
    const wrapper = await mountField(proxyListingMarkets(), 'BTCUSDT')

    await wrapper.find('[data-testid="tab-taiwanStock"]').trigger('click')

    expect(wrapper.findAll('option').map(option => option.element.value)).not.toContain('BTCUSDT')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['2330'])
  })

  it('選著的那一檔就屬於這個市場時不動它', async () => {
    const wrapper = await mountField(proxyListingMarkets(), '2454')

    await wrapper.find('[data-testid="tab-taiwanStock"]').trigger('click')

    expect(wrapper.props('modelValue')).toBe('2454')
  })

  it('這個市場一檔都沒有時說得出原因，選單也不留一檔對不上的充數', async () => {
    const wrapper = await mountField({
      findTradingSymbols: vi.fn().mockResolvedValue([buildTradingSymbol('BTCUSDT')]),
    }, 'BTCUSDT')

    await wrapper.find('[data-testid="tab-taiwanStock"]').trigger('click')

    expect(wrapper.text()).toContain('這個市場目前沒有任何交易標的')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([''])
    expect(wrapper.find('[data-testid="symbol-select"]').text()).toContain('沒有可選的標的')
  })
})

describe('SymbolField 那一行說明', () => {
  it('一切正常時說的是這份清單是什麼，而不是替所有標的下一個結論', async () => {
    // 每一檔的市場與有沒有即時更新寫在選項自己身上。這一句若說成
    // 「沒有即時更新的標的…」，讀起來就是全部都沒有——而那不是真的。
    const wrapper = await mountField({
      findTradingSymbols: vi.fn().mockResolvedValue([
        buildTradingSymbol('2330', { market: 'taiwanStock' }),
      ]),
    }, '2330')

    expect(wrapper.text()).toContain('後端認得的每一個交易標的')
    expect(wrapper.text()).not.toContain('沒有即時更新的標的')
  })
})
