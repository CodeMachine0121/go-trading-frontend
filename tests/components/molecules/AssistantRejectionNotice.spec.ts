import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import AssistantRejectionNotice from '~/components/molecules/AssistantRejectionNotice.vue'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

describe('AssistantRejectionNotice', () => {
  it('如實說出被拒絕的原因', () => {
    // 「今日額度已用盡，於 X 重置」與「稍後再試」要做的事不同，所以原因要原樣說出來。
    const wrapper = mount(AssistantRejectionNotice, {
      props: { message: new UntranslatedTextVo('今日助手用量額度 300000 已用盡，於 2026-09-05T00:00:00Z 重置') },
    })

    expect(wrapper.get('[data-testid="assistant-rejection-message"]').text())
      .toContain('2026-09-05T00:00:00Z')
  })

  it('給一個再試一次，使用者不必重打', async () => {
    const wrapper = mount(AssistantRejectionNotice, { props: { message: new UntranslatedTextVo('助手目前沒有回應') } })

    await wrapper.get('[data-testid="assistant-rejection-retry"]').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('重試沒有意義時不給那顆鍵', () => {
    // 那一段對話已經不在了，再送一次也還是不在。
    const wrapper = mount(AssistantRejectionNotice, {
      props: { message: new LocalizedTextVo('找不到這段對話', 'Conversation not found'), retryable: false },
    })

    expect(wrapper.find('[data-testid="assistant-rejection-retry"]').exists()).toBe(false)
  })

  it.each([
    {
      name: '操作台自己說的那一句換成英文',
      message: new LocalizedTextVo('找不到這段對話', 'Conversation not found'),
      expectedMessage: 'Conversation not found',
    },
    {
      name: '後端說的原因原樣呈現',
      message: new UntranslatedTextVo('今日助手用量額度已用盡'),
      expectedMessage: '今日助手用量額度已用盡',
    },
  ])('英文畫面上：$name', async ({ message, expectedMessage }) => {
    const wrapper = mount(AssistantRejectionNotice, { props: { message } })
    wrapper.vm.$i18n.locale = 'en'
    await nextTick()

    expect(wrapper.get('[data-testid="assistant-rejection-message"]').text()).toBe(expectedMessage)
    expect(wrapper.get('[data-testid="assistant-rejection-retry"]').text()).toBe('Try again')
  })
})
