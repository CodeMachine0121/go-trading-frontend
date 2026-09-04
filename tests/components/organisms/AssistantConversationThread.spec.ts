// @vitest-environment nuxt
// 訊息底下那顆複製鍵問的是組裝根注入的剪貼簿，所以這一份要跑在 Nuxt runtime 裡。
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AssistantConversationThread from '~/components/organisms/AssistantConversationThread.vue'
import type { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
import { SUGGESTED_PROMPTS, buildMessage, buildNote } from '../../fixtures/assistant-conversation'
import { buildTimeZone } from '../../fixtures/time-zone'

function mountThread(props: {
  messages?: ConversationMessageDto[]
  pending?: boolean
  rejectionMessage?: string | null
}) {
  return mount(AssistantConversationThread, {
    props: {
      messages: props.messages ?? [],
      pending: props.pending ?? false,
      rejectionMessage: props.rejectionMessage ?? null,
      suggestedPrompts: SUGGESTED_PROMPTS,
      timeZone: buildTimeZone(),
    },
  })
}

describe('AssistantConversationThread 空的時候', () => {
  it('明說可以問什麼，並給幾句建議提問', () => {
    // 只放一句「請開始輸入」等於要人猜這位助手會什麼。
    const wrapper = mountThread({ messages: [] })

    expect(wrapper.find('[data-testid="assistant-thread-empty"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="assistant-suggested-prompt"]'))
      .toHaveLength(SUGGESTED_PROMPTS.length)
  })

  it('點一句建議提問就把它交出去', async () => {
    const wrapper = mountThread({ messages: [] })

    await wrapper.findAll('[data-testid="assistant-suggested-prompt"]')[0]?.trigger('click')

    expect(wrapper.emitted('selectPrompt')).toEqual([[SUGGESTED_PROMPTS[0]]])
  })

  it('已經送出而還在等時，建議提問就收起來了', () => {
    // 那一句已經送出去了，還留著一排範例只會讓人再點一次。
    const wrapper = mountThread({ messages: [buildMessage('ask', '問一句')], pending: true })

    expect(wrapper.find('[data-testid="assistant-suggested-prompts"]').exists()).toBe(false)
  })
})

describe('AssistantConversationThread 有訊息的時候', () => {
  it('每一則都畫出來，順序照拿到的那一份', () => {
    const wrapper = mountThread({
      messages: [
        buildMessage('ask', '問 1'),
        buildMessage('answer', '答 1', buildNote()),
      ],
    })

    expect(wrapper.findAll('[data-testid="assistant-message-ask"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-testid="assistant-message-answer"]')).toHaveLength(1)
    expect(wrapper.find('[data-testid="assistant-thread-empty"]').exists()).toBe(false)
  })

  it('等待中在最後面長出一個佔位', () => {
    // 它長在提問下面而不是蓋住整頁：使用者要看得到自己問了什麼。
    const wrapper = mountThread({ messages: [buildMessage('ask', '問一句')], pending: true })

    expect(wrapper.find('[data-testid="assistant-pending"]').exists()).toBe(true)
  })

  it('回答回來就沒有佔位了', () => {
    const wrapper = mountThread({
      messages: [buildMessage('ask', '問一句'), buildMessage('answer', '答一句', buildNote())],
      pending: false,
    })

    expect(wrapper.find('[data-testid="assistant-pending"]').exists()).toBe(false)
  })
})

describe('AssistantConversationThread 被拒絕的時候', () => {
  it('警示塊長在對話串裡，不是畫面頂端的橫幅', () => {
    // 額度用盡是「這一句沒送成」，不是「整個畫面壞了」。
    const wrapper = mountThread({
      messages: [buildMessage('ask', '問一句')],
      rejectionMessage: '今日助手用量額度已用盡',
    })

    const notice = wrapper.get('[data-testid="assistant-rejection"]')
    expect(notice.text()).toContain('今日助手用量額度已用盡')
  })

  it('警示塊在提問下面，也就是回答該出現的位置', () => {
    const wrapper = mountThread({
      messages: [buildMessage('ask', '問一句')],
      rejectionMessage: '助手目前沒有回應',
    })

    const html = wrapper.html()
    expect(html.indexOf('assistant-message-ask'))
      .toBeLessThan(html.indexOf('assistant-rejection'))
  })

  it('還在等的時候不顯示警示塊', () => {
    // 上一次的拒絕不該蓋在這一次的等待上面。
    const wrapper = mountThread({
      messages: [buildMessage('ask', '問一句')],
      pending: true,
      rejectionMessage: '上一次被拒絕了',
    })

    expect(wrapper.find('[data-testid="assistant-rejection"]').exists()).toBe(false)
  })

  it('再試一次交得出去', async () => {
    const wrapper = mountThread({
      messages: [buildMessage('ask', '問一句')],
      rejectionMessage: '助手目前沒有回應',
    })

    await wrapper.get('[data-testid="assistant-rejection-retry"]').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('一則都還沒有時不給再試一次', () => {
    // 打開一段不存在的對話而退回新對話時，沒有哪一句可以重送。
    const wrapper = mountThread({
      messages: [],
      rejectionMessage: '找不到這段對話，已經替你開一段新的。',
    })

    expect(wrapper.find('[data-testid="assistant-rejection-retry"]').exists()).toBe(false)
  })
})
