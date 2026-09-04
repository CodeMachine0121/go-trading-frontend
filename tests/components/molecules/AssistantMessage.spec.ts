import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AssistantMessage from '~/components/molecules/AssistantMessage.vue'
import { buildMessage, buildNote } from '../../fixtures/assistant-conversation'
import { buildTimeZone } from '../../fixtures/time-zone'

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
})
