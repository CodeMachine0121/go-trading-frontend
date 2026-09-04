// @vitest-environment nuxt
// 訊息底下那顆複製鍵問的是組裝根注入的剪貼簿，所以這一份要跑在 Nuxt runtime 裡。
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AssistantMessage from '~/components/molecules/AssistantMessage.vue'
import { buildMessage, buildNote } from '../../fixtures/assistant-conversation'
import { buildTimeZone } from '../../fixtures/time-zone'

const writeText = vi.fn()

beforeEach(() => {
  writeText.mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText } })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('AssistantMessage', () => {
  it('提問與回答分得出來', () => {
    // 回答通常比提問長好幾倍，把它也塞進泡泡裡會讓每一行都變短。
    const ask = mount(AssistantMessage, {
      props: { message: buildMessage('ask', '問一句'), timeZone: buildTimeZone() },
    })
    const answer = mount(AssistantMessage, {
      props: { message: buildMessage('answer', '答一句'), timeZone: buildTimeZone() },
    })

    expect(ask.find('[data-testid="assistant-message-ask"]').exists()).toBe(true)
    expect(answer.find('[data-testid="assistant-message-answer"]').exists()).toBe(true)
    // 那個機器人頭像只掛在回答那一側；提問那一側掛上去就變成自問自答。
    expect(answer.find('.assistant-message__avatar').exists()).toBe(true)
    expect(ask.find('.assistant-message__avatar').exists()).toBe(false)
  })

  it('時刻照選定的時區呈現', () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: buildMessage('answer', '答一句'),
        timeZone: buildTimeZone('Asia/Taipei'),
      },
    })

    // 10:00 的世界標準時間在台北是 18:00。
    expect(wrapper.get('[data-testid="assistant-message-meta"]').text()).toContain('18:00')
  })

  it('剛收到的那一則附上查了幾次與份量', () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: buildMessage('answer', '答一句', buildNote(3, 3184)),
        timeZone: buildTimeZone(),
      },
    })

    expect(wrapper.get('[data-testid="assistant-message-meta"]').text())
      .toContain('查了 3 次 · 份量 3184')
  })

  it('讀回來的那一則沒有附註，只有時刻', () => {
    // 那組數字只在剛收到那一刻拿得到。這是取捨，不是漏了。
    const wrapper = mount(AssistantMessage, {
      props: { message: buildMessage('answer', '答一句'), timeZone: buildTimeZone() },
    })

    expect(wrapper.get('[data-testid="assistant-message-meta"]').text()).not.toContain('份量')
  })

  it('提早收尾的那一則另外標明', () => {
    // 半個誠實的答案比沒有答案有用，但使用者得知道它是半個。
    const wrapper = mount(AssistantMessage, {
      props: {
        message: buildMessage('answer', '只查到這些', buildNote(8, 9000, true)),
        timeZone: buildTimeZone(),
      },
    })

    expect(wrapper.get('[data-testid="assistant-message-limit"]').text())
      .toContain('已達查詢次數上限')
  })

  it('正常講完的那一則沒有那個標明', () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: buildMessage('answer', '答完了', buildNote(2, 3184, false)),
        timeZone: buildTimeZone(),
      },
    })

    expect(wrapper.find('[data-testid="assistant-message-limit"]').exists()).toBe(false)
  })

  it('內容照拆好的塊呈現', () => {
    const wrapper = mount(AssistantMessage, {
      props: {
        message: buildMessage('answer', '## 走勢摘要\n- 收盤 110'),
        timeZone: buildTimeZone(),
      },
    })

    expect(wrapper.get('[data-testid="assistant-answer-heading"]').text()).toBe('走勢摘要')
    expect(wrapper.findAll('ul li')).toHaveLength(1)
  })

  it('回答可以整段複製走', async () => {
    // 複製的是原本那段文字，不是拆好的塊——拆好的塊是給眼睛看的。
    const wrapper = mount(AssistantMessage, {
      props: {
        message: buildMessage('answer', '布林通道的算式如下：\n\n```go\nsum := 0.0\n```'),
        timeZone: buildTimeZone(),
      },
    })

    // 底下那一列的那一顆——程式碼區塊角上還有自己的一顆，只複製那一段。
    await wrapper.get('.assistant-message__footer [data-testid="copy-text-button"]')
      .trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('布林通道的算式如下：\n\n```go\nsum := 0.0\n```')
  })

  it('自己問的那一句不給整段複製', () => {
    // 使用者剛剛才打完那句話，他手上本來就有。
    const wrapper = mount(AssistantMessage, {
      props: { message: buildMessage('ask', '給我一份布林通道的腳本'), timeZone: buildTimeZone() },
    })

    expect(wrapper.find('[data-testid="copy-text-button"]').exists()).toBe(false)
  })
})
