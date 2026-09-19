import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AssistantConsole from '~/components/organisms/AssistantConsole.vue'
import { SUGGESTED_PROMPTS, buildMessage, buildSummary } from '../../fixtures/assistant-conversation'
import { buildTimeZone } from '../../fixtures/time-zone'
import { onADesktop, onAPhone } from '../../fixtures/layout-density'
import type { LayoutDensityDto } from '~/domain/models/dto/layout-density-dto'

function mountConsole(
  layoutDensity: LayoutDensityDto = onADesktop(),
  overrides: {
    conversationsErrorMessage?: string
    rejectionMessage?: string
    draft?: string
    messages?: ReturnType<typeof buildMessage>[]
  } = {},
) {
  return mount(AssistantConsole, {
    props: {
      conversations: [buildSummary(1), buildSummary(2)],
      activeConversationId: 1,
      conversationsErrorMessage: overrides.conversationsErrorMessage ?? null,
      messages: overrides.messages ?? [],
      pending: false,
      rejectionMessage: overrides.rejectionMessage ?? null,
      suggestedPrompts: SUGGESTED_PROMPTS,
      timeZone: buildTimeZone(),
      draft: overrides.draft ?? '',
      layoutDensity,
    },
  })
}

describe('AssistantConsole', () => {
  it('寬螢幕上歷史對話一直都在，也沒有一顆打開它的鍵', () => {
    // 一顆把已經看得到的東西「打開」的鍵只會讓人困惑。
    const wrapper = mountConsole()

    expect(wrapper.find('[data-testid="assistant-list-item-2"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="toggle-conversation-list"]').exists()).toBe(false)
  })

  it('窄螢幕上先只給對話本身，歷史收在一顆鍵後面', () => {
    // 390 分成兩欄之後，一則帶小標與條列的回答會被擠成一條細長的柱子。
    const wrapper = mountConsole(onAPhone())

    expect(wrapper.find('[data-testid="assistant-list-item-2"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="toggle-conversation-list"]').attributes('aria-expanded'))
      .toBe('false')
  })

  it('按下那顆鍵，歷史對話攤開', async () => {
    const wrapper = mountConsole(onAPhone())

    await wrapper.get('[data-testid="toggle-conversation-list"]').trigger('click')

    expect(wrapper.find('[data-testid="assistant-list-item-2"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="toggle-conversation-list"]').attributes('aria-expanded'))
      .toBe('true')
  })

  it('挑了一段對話，清單自己收起來——挑完要看的是對話本身', async () => {
    const wrapper = mountConsole(onAPhone())
    await wrapper.get('[data-testid="toggle-conversation-list"]').trigger('click')

    await wrapper.get('[data-testid="assistant-list-item-2"]').trigger('click')

    expect(wrapper.emitted('selectConversation')).toEqual([[2]])
    expect(wrapper.find('[data-testid="assistant-list-item-2"]').exists()).toBe(false)
  })

  it('開了新的一段，清單也收起來', async () => {
    const wrapper = mountConsole(onAPhone())
    await wrapper.get('[data-testid="toggle-conversation-list"]').trigger('click')

    await wrapper.get('[data-testid="assistant-list-start-new"]').trigger('click')

    expect(wrapper.emitted('startNew')).toHaveLength(1)
    expect(wrapper.find('[data-testid="assistant-list-item-2"]').exists()).toBe(false)
  })

  it('那顆鍵說得出現在有幾段對話', () => {
    const wrapper = mountConsole(onAPhone())

    expect(wrapper.get('[data-testid="toggle-conversation-list"]').text()).toContain('2')
  })

  it('清單讀不回來時，重試那一下傳得出去', async () => {
    const wrapper = mountConsole(onADesktop(), { conversationsErrorMessage: '連不上後端' })

    await wrapper.get('[data-testid="assistant-list-reload"]').trigger('click')

    expect(wrapper.emitted('reload')).toHaveLength(1)
  })

  it('一則被擋下來的問題，重試那一下傳得出去', async () => {
    const wrapper = mountConsole(onADesktop(), {
      rejectionMessage: '今天的額度用完了',
      messages: [buildMessage('ask', '台積電今天怎麼樣')],
    })

    await wrapper.get('[data-testid="assistant-rejection-retry"]').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('點一句建議提問，就等於把它問出去', async () => {
    const wrapper = mountConsole()

    await wrapper.findAll('[data-testid="assistant-suggested-prompt"]')[0]?.trigger('click')

    expect(wrapper.emitted('send')).toEqual([[SUGGESTED_PROMPTS[0]]])
  })

  it('打好的那一句送得出去', async () => {
    const wrapper = mountConsole(onADesktop(), { draft: '台積電今天怎麼樣' })

    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('send')).toEqual([['台積電今天怎麼樣']])
  })

  it('打字時那一句往上報，因為草稿與抽屜共用同一份', async () => {
    // 在整頁打到一半、切去抽屜接著打，靠的就是這一份往上報的草稿。
    const wrapper = mountConsole()

    await wrapper.get('[data-testid="assistant-composer-input"]').setValue('均線怎麼算')

    expect(wrapper.emitted('update:draft')).toEqual([['均線怎麼算']])
  })
})
