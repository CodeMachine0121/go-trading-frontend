import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import SymbolSearchDialog from '~/components/molecules/SymbolSearchDialog.vue'
import { SymbolSearchOptionDto } from '~/domain/models/dto/symbol-search-option-dto'

const OPTIONS = [
  new SymbolSearchOptionDto('BTCUSDT', 'Bitcoin', '加密貨幣'),
  new SymbolSearchOptionDto('ETHUSDT', 'Ethereum', '加密貨幣'),
  new SymbolSearchOptionDto('2330', '台積電', '台股'),
]

async function openDialog(initialQuery = '') {
  const wrapper = mount(SymbolSearchDialog, { props: { open: false, options: OPTIONS, initialQuery } })
  await wrapper.setProps({ open: true })
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

  it('關著的時候什麼都不畫', () => {
    const wrapper = mount(SymbolSearchDialog, { props: { open: false, options: OPTIONS } })

    expect(wrapper.find('[data-testid="symbol-search-input"]').exists()).toBe(false)
  })
})
