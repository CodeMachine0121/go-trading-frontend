import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'

/**
 * 像使用者那樣換一檔：按上方細邊的交易標的、在商品搜尋裡點那一檔。
 * 換標的的規則（重新取、看的那一段不變）是面板的事，這裡只代替那兩下點擊。
 */
export async function pickSymbolInSearch(wrapper: VueWrapper, symbol: string): Promise<void> {
  await wrapper.get('[data-testid="symbol-search-button"]').trigger('click')
  const option = wrapper.findAll('[data-testid="symbol-search-option"]')
    .find(candidate => candidate.text().startsWith(symbol))
  if (option === undefined) {
    throw new Error(`商品搜尋裡沒有 ${symbol}`)
  }
  await option.trigger('click')
  await flushPromises()
}

/** 打開「指標與策略腳本」對話框——指標的清單與旋鈕都在裡面。 */
export async function openIndicatorDialog(wrapper: VueWrapper): Promise<void> {
  await wrapper.get('[data-testid="open-indicators"]').trigger('click')
  await flushPromises()
}

/** 打開畫法選單、選第幾種（蠟燭、美國線、曲線、面積）。 */
export async function pickDrawing(wrapper: VueWrapper, index: number): Promise<void> {
  await wrapper.get('[data-testid="drawing-menu-button"]').trigger('click')
  await wrapper.findAll('[data-testid="drawing-button"]')[index]?.trigger('click')
  await flushPromises()
}
