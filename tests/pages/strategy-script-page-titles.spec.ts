import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import SpotStrategyScriptPage from '~/pages/strategy-scripts/index.vue'
import ContractStrategyScriptPage from '~/pages/contract-strategy-scripts/index.vue'
import { buildTimeZone } from '../fixtures/time-zone'

// 頁面只做接線，這裡只看兩件事：它向版型宣告的標題說出寫的是哪一種行情，以及它交給工作區的是哪一種。
// 標題由 console 版型讀 definePageMeta 畫出來，所以這裡攔下頁面宣告的那一份來看。
const declaredMeta = vi.hoisted(() => [] as { layout?: string, consoleTitle?: string }[])

mockNuxtImport('definePageMeta', () => (meta: { layout?: string, consoleTitle?: string }) => {
  declaredMeta.push(meta)
})
mockNuxtImport('useNuxtApp', () => () => ({}))
mockNuxtImport('useSelectedTimeZone', () => () => ({
  selectableTimeZones: [], selectedTimeZone: buildTimeZone('UTC'), selectTimeZone: () => {},
}))

const PANEL_STUB = { props: ['marketDataKind'], template: '<p data-testid="kind">{{ marketDataKind ?? "kCandle" }}</p>' }

describe('兩個策略腳本畫面', () => {
  it.each([
    ['現貨策略腳本', 'kCandle', SpotStrategyScriptPage],
    ['合約策略腳本', 'contractKCandle', ContractStrategyScriptPage],
  ])('標題是「%s」，工作區寫的是 %s', (expectedTitle, expectedKind, page) => {
    declaredMeta.length = 0
    const wrapper = mount(page, { global: { stubs: { IndicatorCalculationPanel: PANEL_STUB } } })

    expect(declaredMeta).toEqual([expect.objectContaining({ layout: 'console', consoleTitle: expectedTitle })])
    expect(wrapper.get('[data-testid="kind"]').text()).toBe(expectedKind)
  })
})
