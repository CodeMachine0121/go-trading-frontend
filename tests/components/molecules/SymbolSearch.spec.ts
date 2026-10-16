import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import SymbolSearch from '~/components/molecules/SymbolSearch.vue'
import { SymbolSearchOptionDto } from '~/domain/models/dto/symbol-search-option-dto'

const OPTIONS = [
  new SymbolSearchOptionDto('BTCUSDT', 'Bitcoin', '加密貨幣'),
  new SymbolSearchOptionDto('ETHUSDT', 'Ethereum', '加密貨幣'),
  new SymbolSearchOptionDto('2330', '台積電', '台股'),
]

/** 沒帶字時像使用者那樣按那一顆；帶字時像在圖上直接打字那樣從外面打開。 */
async function openDialog(initialQuery = '') {
  const wrapper = mount(SymbolSearch, { props: { options: OPTIONS, symbolLabel: 'BTCUSDT' } })
  if (initialQuery === '') {
    await wrapper.get('[data-testid="symbol-search-button"]').trigger('click')
  }
  else {
    await (wrapper.vm as unknown as { openSearch: (query: string) => Promise<void> }).openSearch(initialQuery)
  }
  await nextTick()

  return wrapper
}

describe('商品搜尋', () => {
  it('打開時搜尋框裡是帶進來的字，並照它篩', async () => {
    const wrapper = await openDialog('E')

    expect((wrapper.get('[data-testid="symbol-search-input"]').element as HTMLInputElement).value).toBe('E')
    expect(wrapper.findAll('[data-testid="symbol-search-option"]').map(option => option.text())).toEqual(['ETHUSDTEthereum加密貨幣'])
  })

  it('沒帶字打開時列出全部', async () => {
    expect((await openDialog()).findAll('[data-testid="symbol-search-option"]')).toHaveLength(3)
  })

  it('打字篩選代號或名稱，大小寫不拘', async () => {
    const wrapper = await openDialog()

    await wrapper.get('[data-testid="symbol-search-input"]').setValue('台積')
    expect(wrapper.findAll('[data-testid="symbol-search-option"]').map(option => option.text())).toEqual(['2330台積電台股'])

    await wrapper.get('[data-testid="symbol-search-input"]').setValue('eth')
    expect(wrapper.findAll('[data-testid="symbol-search-option"]').map(option => option.text())).toEqual(['ETHUSDTEthereum加密貨幣'])
  })

  it('找不到時說找不到', async () => {
    const wrapper = await openDialog()

    await wrapper.get('[data-testid="symbol-search-input"]').setValue('ZZZ')

    expect(wrapper.get('[data-testid="symbol-search-empty"]').text()).toBe('找不到這個代號。')
  })

  it('上下鍵挑、Enter 選定；不會挑到清單外面', async () => {
    const wrapper = await openDialog()
    const input = wrapper.get('[data-testid="symbol-search-input"]')

    await input.trigger('keydown', { key: 'ArrowUp' })
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('pick')).toEqual([['2330']])
  })

  it('沒有符合的時候按 Enter 什麼都不選', async () => {
    const wrapper = await openDialog()
    await wrapper.get('[data-testid="symbol-search-input"]').setValue('ZZZ')

    await wrapper.get('[data-testid="symbol-search-input"]').trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('pick')).toBeUndefined()
  })

  it('點一列就選定它', async () => {
    const wrapper = await openDialog()

    await wrapper.findAll('[data-testid="symbol-search-option"]')[1]?.trigger('click')

    expect(wrapper.emitted('pick')).toEqual([['ETHUSDT']])
  })

  it('滑鼠移到哪一列，Enter 選的就是哪一列', async () => {
    const wrapper = await openDialog()

    await wrapper.findAll('[data-testid="symbol-search-option"]')[2]?.trigger('mouseenter')
    await wrapper.get('[data-testid="symbol-search-input"]').trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('pick')).toEqual([['2330']])
  })

  it('還沒按之前只有那一顆：寫著目前那一檔', () => {
    const wrapper = mount(SymbolSearch, { props: { options: OPTIONS, symbolLabel: 'BTCUSDT' } })

    expect(wrapper.get('[data-testid="symbol-search-button"]').text()).toBe('BTCUSDT')
    expect(wrapper.find('[data-testid="symbol-search-input"]').exists()).toBe(false)
  })

  it('選定之後收起來', async () => {
    const wrapper = await openDialog()

    await wrapper.findAll('[data-testid="symbol-search-option"]')[0]?.trigger('click')

    expect(wrapper.find('[data-testid="symbol-search-input"]').exists()).toBe(false)
  })

  it('再打開一次時搜尋框是空的，從第一列挑起', async () => {
    const wrapper = await openDialog()
    await wrapper.get('[data-testid="symbol-search-input"]').setValue('ETH')
    await wrapper.findAll('[data-testid="symbol-search-option"]')[0]?.trigger('click')

    await wrapper.get('[data-testid="symbol-search-button"]').trigger('click')

    expect((wrapper.get('[data-testid="symbol-search-input"]').element as HTMLInputElement).value).toBe('')
  })
})
