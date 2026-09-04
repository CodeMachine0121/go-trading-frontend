import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AssistantDrawer from '~/components/organisms/AssistantDrawer.vue'
import type { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
import { SUGGESTED_PROMPTS, buildMessage, buildNote } from '../../fixtures/assistant-conversation'
import { buildTimeZone } from '../../fixtures/time-zone'

function mountDrawer(props: {
  open: boolean
  messages?: ConversationMessageDto[]
  pending?: boolean
  draft?: string
}) {
  return mount(AssistantDrawer, {
    props: {
      open: props.open,
      messages: props.messages ?? [],
      pending: props.pending ?? false,
      rejectionMessage: null,
      suggestedPrompts: SUGGESTED_PROMPTS,
      timeZone: buildTimeZone(),
      draft: props.draft ?? '',
    },
    global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
  })
}

describe('AssistantDrawer 收起來的時候', () => {
  it('什麼都不畫', () => {
    // 叫出它的那一顆鍵不在這裡：它可以被拖到任何地方，而抽屜永遠靠右——
    // 一塊 420 像素的面板跟著一顆鍵到處跑，會在半數位置把它自己推出視窗。
    const wrapper = mountDrawer({ open: false })

    expect(wrapper.find('[data-testid="assistant-drawer-panel"]').exists()).toBe(false)
  })
})

describe('AssistantDrawer 打開的時候', () => {
  it('顯示對話串與輸入框', () => {
    const wrapper = mountDrawer({
      open: true,
      messages: [buildMessage('answer', '在盤整。', buildNote())],
    })

    expect(wrapper.find('[data-testid="assistant-drawer-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="assistant-message-answer"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="assistant-composer-input"]').exists()).toBe(true)
  })

  it('不放對話清單——420 像素硬塞兩欄的結果是兩邊都難用', () => {
    const wrapper = mountDrawer({ open: true })

    expect(wrapper.find('[data-testid="assistant-list-item-1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="assistant-list-empty"]').exists()).toBe(false)
  })

  it('標頭的展開通往整頁，那是換對話的去處', () => {
    const wrapper = mountDrawer({ open: true })

    expect(wrapper.get('[data-testid="assistant-drawer-expand"]').attributes('to'))
      .toBe('/chat')
  })

  it('收起來交得出去', async () => {
    const wrapper = mountDrawer({ open: true })

    await wrapper.get('[data-testid="assistant-drawer-close"]').trigger('click')

    expect(wrapper.emitted('closeDrawer')).toHaveLength(1)
  })

  it('送出時把那一句交出去', async () => {
    const wrapper = mountDrawer({ open: true, draft: 'BTCUSDT 最近走勢如何' })

    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('send')).toEqual([['BTCUSDT 最近走勢如何']])
  })

  it('點建議提問也走同一條送出的路', async () => {
    const wrapper = mountDrawer({ open: true })

    await wrapper.findAll('[data-testid="assistant-suggested-prompt"]')[0]?.trigger('click')

    expect(wrapper.emitted('send')).toEqual([[SUGGESTED_PROMPTS[0]]])
  })

  it('等待中輸入框鎖住', () => {
    const wrapper = mountDrawer({ open: true, pending: true, draft: '問一句' })

    expect(wrapper.get('[data-testid="assistant-composer-input"]').attributes('disabled'))
      .toBeDefined()
  })
})
