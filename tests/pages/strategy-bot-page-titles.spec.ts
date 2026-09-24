import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import SpotStrategyBotPage from '~/pages/strategy-bots/index.vue'
import ContractStrategyBotPage from '~/pages/contract-strategy-bots/index.vue'
import SpotStrategyBotNewPage from '~/pages/strategy-bots/new.vue'
import ContractStrategyBotNewPage from '~/pages/contract-strategy-bots/new.vue'
import SpotStrategyBotEditPage from '~/pages/strategy-bots/[id].vue'
import ContractStrategyBotEditPage from '~/pages/contract-strategy-bots/[id].vue'

// 頁面只做接線，這裡只看兩件事：它向版型宣告的標題說出管的是哪一種機器人，以及它交給底下的是哪一種。
// 標題由 console 版型讀 definePageMeta 畫出來，所以這裡攔下頁面宣告的那一份來看。
const declaredMeta = vi.hoisted(() => [] as { layout?: string, consoleTitle?: string }[])

mockNuxtImport('definePageMeta', () => (meta: { layout?: string, consoleTitle?: string }) => {
  declaredMeta.push(meta)
})
mockNuxtImport('useRoute', () => () => ({ params: { id: '7' } }))

const LIST_STUB = { props: ['marketDataKind'], template: '<p data-testid="kind">{{ marketDataKind }}</p>' }
const WORKBENCH_STUB = {
  props: ['marketDataKind', 'strategyBotId'],
  template: '<p data-testid="kind">{{ marketDataKind }}:{{ strategyBotId }}</p>',
}

describe('兩個策略機器人畫面', () => {
  it.each([
    ['現貨策略機器人', 'kCandle', SpotStrategyBotPage],
    ['合約策略機器人', 'contractKCandle', ContractStrategyBotPage],
  ])('標題是「%s」，清單列的是 %s', (expectedTitle, expectedKind, page) => {
    declaredMeta.length = 0
    const wrapper = mount(page, { global: { stubs: { StrategyBotListPage: LIST_STUB } } })

    expect(declaredMeta).toEqual([expect.objectContaining({ layout: 'console', consoleTitle: expectedTitle })])
    expect(wrapper.get('[data-testid="kind"]').text()).toBe(expectedKind)
  })

  it.each([
    ['現貨策略機器人', 'kCandle:', SpotStrategyBotNewPage],
    ['合約策略機器人', 'contractKCandle:', ContractStrategyBotNewPage],
    ['現貨策略機器人', 'kCandle:7', SpotStrategyBotEditPage],
    ['合約策略機器人', 'contractKCandle:7', ContractStrategyBotEditPage],
  ])('拼一台與改一台的那一頁，標題仍是「%s」，交給工作台的是 %s', (expectedTitle, expectedWiring, page) => {
    declaredMeta.length = 0
    const wrapper = mount(page, { global: { stubs: { StrategyBotWorkbenchPage: WORKBENCH_STUB } } })

    expect(declaredMeta).toEqual([expect.objectContaining({ layout: 'console', consoleTitle: expectedTitle })])
    expect(wrapper.get('[data-testid="kind"]').text()).toBe(expectedWiring)
  })
})
