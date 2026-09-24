import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import SpotStrategyBotPage from '~/pages/strategy-bots/index.vue'
import ContractStrategyBotPage from '~/pages/contract-strategy-bots/index.vue'
import SpotStrategyBotNewPage from '~/pages/strategy-bots/new.vue'
import ContractStrategyBotNewPage from '~/pages/contract-strategy-bots/new.vue'
import { StrategyBotApplication } from '~/application/strategy-bot-application'
import { StrategyBotService } from '~/domain/service/strategy-bot-service'
import type { IStrategyBotProxy } from '~/domain/interface/i-strategy-bot-proxy'
import { buildTimeZone } from '../fixtures/time-zone'

// 頁面只做接線，這裡只看兩件事：名字說出它管的是哪一種機器人，以及它交給底下的是哪一種。
mockNuxtImport('useNuxtApp', () => () => ({
  $strategyBotApplication: new StrategyBotApplication(new StrategyBotService({} as IStrategyBotProxy)),
}))
mockNuxtImport('useSelectedTimeZone', () => () => ({
  selectableTimeZones: [], selectedTimeZone: buildTimeZone('UTC'), selectTimeZone: () => {},
}))
mockNuxtImport('useBackendHealth', () => () => ({
  health: null, checking: false, errorMessage: null, checkBackendHealth: () => {},
}))
mockNuxtImport('useUserSession', () => () => ({ currentUser: null, signOut: () => {} }))

const LAYOUT_STUB = { props: ['title', 'subtitle'], template: '<div><h1>{{ title }}</h1><slot /></div>' }
const PANEL_STUB = { props: ['page'], template: '<p data-testid="kind">{{ page.marketDataKind }}</p>' }
const WORKBENCH_STUB = { props: ['marketDataKind', 'strategyBotId'], template: '<p data-testid="kind">{{ marketDataKind }}</p>' }

describe('兩個策略機器人畫面', () => {
  it.each([
    ['現貨策略機器人', 'kCandle', SpotStrategyBotPage],
    ['合約策略機器人', 'contractKCandle', ContractStrategyBotPage],
  ])('標題是「%s」，清單列的是 %s', (expectedTitle, expectedKind, page) => {
    const wrapper = mount(page, {
      global: { stubs: { ConsoleLayout: LAYOUT_STUB, StrategyBotListPanel: PANEL_STUB } },
    })

    expect(wrapper.get('h1').text()).toBe(expectedTitle)
    expect(wrapper.get('[data-testid="kind"]').text()).toBe(expectedKind)
  })

  it.each([
    ['kCandle', SpotStrategyBotNewPage],
    ['contractKCandle', ContractStrategyBotNewPage],
  ])('拼一台的那一頁拼的是 %s', (expectedKind, page) => {
    const wrapper = mount(page, { global: { stubs: { StrategyBotWorkbenchPage: WORKBENCH_STUB } } })

    expect(wrapper.get('[data-testid="kind"]').text()).toBe(expectedKind)
  })
})
