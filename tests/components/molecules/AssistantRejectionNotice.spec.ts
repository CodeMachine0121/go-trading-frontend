import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AssistantRejectionNotice from '~/components/molecules/AssistantRejectionNotice.vue'

describe('AssistantRejectionNotice', () => {
  it('如實說出被拒絕的原因', () => {
    // 「今日額度已用盡，於 X 重置」與「稍後再試」要做的事不同，所以原因要原樣說出來。
    const wrapper = mount(AssistantRejectionNotice, {
      props: { message: '今日助手用量額度 300000 已用盡，於 2026-09-05T00:00:00Z 重置' },
    })

    expect(wrapper.get('[data-testid="assistant-rejection-message"]').text())
      .toContain('2026-09-05T00:00:00Z')
  })

  it('給一個再試一次，使用者不必重打', async () => {
    const wrapper = mount(AssistantRejectionNotice, { props: { message: '助手目前沒有回應' } })

    await wrapper.get('[data-testid="assistant-rejection-retry"]').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('重試沒有意義時不給那顆鍵', () => {
    // 那一段對話已經不在了，再送一次也還是不在。
    const wrapper = mount(AssistantRejectionNotice, {
      props: { message: '找不到這段對話', retryable: false },
    })

    expect(wrapper.find('[data-testid="assistant-rejection-retry"]').exists()).toBe(false)
  })
})
