// @vitest-environment nuxt
// 訊息底下那顆複製鍵問的是組裝根注入的剪貼簿，所以這一份要跑在 Nuxt runtime 裡。
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AssistantConversationThread from '~/components/organisms/AssistantConversationThread.vue'
import { AssistantPendingRevisionDto } from '~/domain/models/dto/assistant-pending-revision-dto'
import { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
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

describe('AssistantConversationThread 一次問答沒有走完的時候', () => {
  it('送不出去的那一句下面看得到原因與再試一次', async () => {
    // 這一塊只在「不是在等」的時候出現，所以它能不能被看到，完全取決於
    // 那一則提問有沒有還宣稱自己在寫。宣稱著就什麼都看不到——
    // 沒有說明、按不到再試一次、也送不出下一句。
    const wrapper = mountThread({
      messages: [buildMessage('ask', '問一句', null, 'failed')],
      pending: false,
      rejectionMessage: '連不上後端 go-trading API',
    })

    expect(wrapper.get('[data-testid="assistant-rejection-message"]').text())
      .toContain('連不上後端')

    await wrapper.get('[data-testid="assistant-rejection-retry"]').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('寫到一半壞掉的那一句下面看得到後端給的原因', () => {
    const wrapper = mountThread({
      messages: [buildMessage('ask', '問一句', null, 'failed', '系統重新啟動時中斷了這則回答')],
      pending: false,
      rejectionMessage: '系統重新啟動時中斷了這則回答',
    })

    expect(wrapper.get('[data-testid="assistant-rejection-message"]').text())
      .toContain('系統重新啟動時中斷了這則回答')
    expect(wrapper.find('[data-testid="assistant-pending"]').exists()).toBe(false)
  })

  it('還在寫的那一句下面是等待，不是原因', () => {
    const wrapper = mountThread({
      messages: [buildMessage('ask', '問一句', null, 'running')],
      pending: true,
      rejectionMessage: null,
    })

    expect(wrapper.find('[data-testid="assistant-pending"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="assistant-rejection"]').exists()).toBe(false)
  })
})

describe('AssistantConversationThread 的待確認修改', () => {
  function messageWithRevision(): ConversationMessageDto {
    const answer = buildMessage('answer', '已提出，等你確認。')

    return new ConversationMessageDto(
      answer.role, answer.content, answer.blocks, answer.createdAt, answer.status, answer.note, answer.failureReason,
      [new AssistantPendingRevisionDto(70, '策略腳本「二十根均線」', '{}', '等你確認', true, 'warning', answer.createdAt)])
  }

  it('每一筆接在它所屬的那一則下面，按下的那一筆往上交', async () => {
    const wrapper = mount(AssistantConversationThread, {
      props: {
        messages: [buildMessage('ask', '改一下'), messageWithRevision()],
        pending: false,
        rejectionMessage: null,
        suggestedPrompts: SUGGESTED_PROMPTS,
        timeZone: buildTimeZone(),
        pendingRevisionErrors: { 70: '這幾台機器人正在用它跑：早盤突破，請先停止它們' },
      },
    })

    expect(wrapper.findAll('[data-testid="assistant-pending-revision"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="assistant-pending-revision-error"]').text())
      .toBe('這幾台機器人正在用它跑：早盤突破，請先停止它們')

    await wrapper.get('[data-testid="assistant-pending-revision-confirm"]').trigger('click')
    await wrapper.get('[data-testid="assistant-pending-revision-reject"]').trigger('click')

    expect(wrapper.emitted('confirmPendingRevision')).toEqual([[70]])
    expect(wrapper.emitted('rejectPendingRevision')).toEqual([[70]])
  })

  it('有一筆正在處理時，每一筆的鍵都不給按', () => {
    const wrapper = mount(AssistantConversationThread, {
      props: {
        messages: [messageWithRevision()],
        pending: false,
        rejectionMessage: null,
        suggestedPrompts: SUGGESTED_PROMPTS,
        timeZone: buildTimeZone(),
        resolvingPendingRevisionId: 70,
      },
    })

    expect(wrapper.get('[data-testid="assistant-pending-revision-confirm"]').attributes('disabled')).toBeDefined()
  })
})

describe('AssistantConversationThread 沒寫完的問答', () => {
  it('那一筆掛在失敗的提問下面，內容照原樣當文字', () => {
    const failedAsk = buildMessage('ask', '改一下', null, 'failed', '助手目前沒有回應')
    const wrapper = mount(AssistantConversationThread, {
      props: {
        messages: [new ConversationMessageDto(
          failedAsk.role, failedAsk.content, failedAsk.blocks, failedAsk.createdAt, failedAsk.status,
          failedAsk.note, failedAsk.failureReason,
          [new AssistantPendingRevisionDto(70, '策略腳本「二十根均線」', '<img src=x onerror=alert(1)>', '等你確認', true, 'warning', failedAsk.createdAt)])],
        pending: false,
        rejectionMessage: null,
        suggestedPrompts: SUGGESTED_PROMPTS,
        timeZone: buildTimeZone(),
      },
    })

    expect(wrapper.findAll('[data-testid="assistant-pending-revision"]')).toHaveLength(1)
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('[data-testid="assistant-pending-revision-content"]').text())
      .toBe('<img src=x onerror=alert(1)>')
  })
})
