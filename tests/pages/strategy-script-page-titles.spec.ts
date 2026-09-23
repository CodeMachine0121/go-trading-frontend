import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import SpotStrategyScriptPage from '~/pages/strategy-scripts/index.vue'
import ContractStrategyScriptPage from '~/pages/contract-strategy-scripts/index.vue'
import { buildTimeZone } from '../fixtures/time-zone'

// 頁面只做接線，這裡只看兩件事：名字說出它寫的是哪一種行情，以及它交給工作區的是哪一種。
mockNuxtImport('useNuxtApp', () => () => ({}))
mockNuxtImport('useSelectedTimeZone', () => () => ({
  selectableTimeZones: [], selectedTimeZone: buildTimeZone('UTC'), selectTimeZone: () => {},
}))
mockNuxtImport('useBackendHealth', () => () => ({
  health: null, checking: false, errorMessage: null, checkBackendHealth: () => {},
}))
mockNuxtImport('useUserSession', () => () => ({ currentUser: null, signOut: () => {} }))

const LAYOUT_STUB = { props: ['title', 'subtitle'], template: '<div><h1>{{ title }}</h1><slot /></div>' }
const PANEL_STUB = { props: ['marketDataKind'], template: '<p data-testid="kind">{{ marketDataKind ?? "kCandle" }}</p>' }

describe('兩個策略腳本畫面', () => {
  it.each([
    ['現貨策略腳本', 'kCandle', SpotStrategyScriptPage],
    ['合約策略腳本', 'contractKCandle', ContractStrategyScriptPage],
  ])('標題是「%s」，工作區寫的是 %s', (expectedTitle, expectedKind, page) => {
    const wrapper = mount(page, {
      global: { stubs: { ConsoleLayout: LAYOUT_STUB, IndicatorCalculationPanel: PANEL_STUB } },
    })

    expect(wrapper.get('h1').text()).toBe(expectedTitle)
    expect(wrapper.get('[data-testid="kind"]').text()).toBe(expectedKind)
  })
})
