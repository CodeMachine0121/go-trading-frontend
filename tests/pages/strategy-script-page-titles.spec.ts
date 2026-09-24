import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import SpotStrategyScriptPage from '~/pages/strategy-scripts/index.vue'
import ContractStrategyScriptPage from '~/pages/contract-strategy-scripts/index.vue'
import { buildTimeZone } from '../fixtures/time-zone'

// 頁面只做接線，這裡只看兩件事：它向版型宣告的標題說出寫的是哪一種行情，以及它交給工作區的是哪一種。
// 標題由 console 版型讀 definePageMeta 畫出來，所以這裡攔下頁面宣告的那一份來看。
const declaredMeta = vi.hoisted(() => [] as { layout?: string, consoleTitle?: string }[])
const leaveGuards = vi.hoisted(() => [] as (() => boolean)[])

mockNuxtImport('definePageMeta', () => (meta: { layout?: string, consoleTitle?: string }) => {
  declaredMeta.push(meta)
})
mockNuxtImport('useNuxtApp', () => () => ({}))
mockNuxtImport('onBeforeRouteLeave', () => (guard: () => boolean) => {
  leaveGuards.push(guard)
})
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

/** 工作區的替身：只交得出「編輯區裡有沒有還沒存的東西」這一個答案。 */
function panelWithUnsavedDraft(unsaved: boolean) {
  return defineComponent({
    setup(_props, { expose }) {
      expose({ hasUnsavedDraft: () => unsaved })

      return () => h('div')
    },
  })
}

describe('策略腳本畫面離開之前', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    leaveGuards.length = 0
  })

  it.each([
    { name: '什麼都沒改：不問、直接走', page: SpotStrategyScriptPage, unsaved: false, answer: true, asked: false, allowed: true },
    { name: '有還沒存的算式、答應離開：問過再走', page: SpotStrategyScriptPage, unsaved: true, answer: true, asked: true, allowed: true },
    { name: '有還沒存的算式、不想離開：留在這一頁', page: SpotStrategyScriptPage, unsaved: true, answer: false, asked: true, allowed: false },
    { name: '合約那一頁同一條規則', page: ContractStrategyScriptPage, unsaved: true, answer: false, asked: true, allowed: false },
  ])('$name', ({ page, unsaved, answer, asked, allowed }) => {
    const confirm = vi.fn(() => answer)
    vi.stubGlobal('confirm', confirm)
    mount(page, { global: { stubs: { IndicatorCalculationPanel: panelWithUnsavedDraft(unsaved) } } })

    const allowedToLeave = leaveGuards.at(-1)!()

    expect(allowedToLeave).toBe(allowed)
    expect(confirm).toHaveBeenCalledTimes(asked ? 1 : 0)
    if (asked) {
      expect(confirm).toHaveBeenCalledWith('這一頁改過的東西還沒存，確定要離開嗎？')
    }
  })
})
