import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AssistantConversationList from '~/components/organisms/AssistantConversationList.vue'
import { buildSummary } from '../../fixtures/assistant-conversation'
import { buildTimeZone } from '../../fixtures/time-zone'

function mountList(props: {
  conversations?: ReturnType<typeof buildSummary>[]
  activeConversationId?: number | null
  errorMessage?: string | null
  showStartNew?: boolean
}) {
  return mount(AssistantConversationList, {
    props: {
      conversations: props.conversations ?? [],
      activeConversationId: props.activeConversationId ?? null,
      errorMessage: props.errorMessage ?? null,
      timeZone: buildTimeZone(),
      showStartNew: props.showStartNew ?? true,
    },
    global: { stubs: { NuxtLink: true } },
  })
}

describe('AssistantConversationList', () => {
  it('每一段都在清單上，順序照拿到的那一份', () => {
    // 後端已經把最近有動靜的排在最前面，這裡不再自己排一次。
    const wrapper = mountList({ conversations: [buildSummary(2, 4), buildSummary(1, 2)] })

    expect(wrapper.find('[data-testid="assistant-list-item-2"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="assistant-list-item-1"]').exists()).toBe(true)
  })

  it('每一列說出時刻與有幾則', () => {
    // 後端不讓對話取名字，這兩個數字是唯一能認出「這是哪一段」的東西。
    const wrapper = mountList({ conversations: [buildSummary(7, 6)] })

    const item = wrapper.get('[data-testid="assistant-list-item-7"]')
    expect(item.text()).toContain('6 則訊息')
    expect(item.text()).toContain('10:00')
  })

  it('正在看的那一段標出來', () => {
    const wrapper = mountList({
      conversations: [buildSummary(1), buildSummary(2)],
      activeConversationId: 2,
    })

    expect(wrapper.get('[data-testid="assistant-list-item-2"]').attributes('aria-current'))
      .toBe('true')
    expect(wrapper.get('[data-testid="assistant-list-item-1"]').attributes('aria-current'))
      .toBeUndefined()
  })

  it('挑一段就交出它的識別碼', async () => {
    const wrapper = mountList({ conversations: [buildSummary(7)] })

    await wrapper.get('[data-testid="assistant-list-item-7"]').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[7]])
  })

  it('一段都沒有時明說，不留一片白', () => {
    const wrapper = mountList({ conversations: [] })

    expect(wrapper.get('[data-testid="assistant-list-empty"]').text()).toContain('還沒有任何對話')
  })

  it('取不到清單與一段都沒有是兩件事', async () => {
    // 用一個空清單同時表示兩者，會讓後端掛掉時看起來像「你還沒問過任何問題」。
    const wrapper = mountList({ conversations: [], errorMessage: '連不上後端 go-trading API' })

    expect(wrapper.get('[data-testid="assistant-list-error"]').text()).toContain('連不上後端')
    expect(wrapper.find('[data-testid="assistant-list-empty"]').exists()).toBe(false)

    await wrapper.get('[data-testid="assistant-list-reload"]').trigger('click')
    expect(wrapper.emitted('reload')).toHaveLength(1)
  })

  it('開新對話交得出去', async () => {
    const wrapper = mountList({ conversations: [buildSummary(7)] })

    await wrapper.get('[data-testid="assistant-list-start-new"]').trigger('click')

    expect(wrapper.emitted('startNew')).toHaveLength(1)
  })

  it('用在標頭已經有開新對話的地方時，自己就不再放一顆', () => {
    // 同一個動作兩個入口，遲早會有一個被改壞。
    const wrapper = mountList({ conversations: [buildSummary(7)], showStartNew: false })

    expect(wrapper.find('[data-testid="assistant-list-start-new"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="assistant-list-item-7"]').exists()).toBe(true)
  })
})
