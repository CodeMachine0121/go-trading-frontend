import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AssistantSuggestedPrompts from '~/components/molecules/AssistantSuggestedPrompts.vue'
import { SUGGESTED_PROMPTS } from '../../fixtures/assistant-conversation'

describe('AssistantSuggestedPrompts', () => {
  it('每一句都在，而且都點得動', () => {
    // 助手辦得到好幾種事而使用者從畫面上看不出來，這幾句是唯一的教學管道。
    const wrapper = mount(AssistantSuggestedPrompts, { props: { prompts: SUGGESTED_PROMPTS } })

    const prompts = wrapper.findAll('[data-testid="assistant-suggested-prompt"]')
    expect(prompts).toHaveLength(SUGGESTED_PROMPTS.length)
    expect(prompts[0]?.text()).toBe(SUGGESTED_PROMPTS[0])
  })

  it('點一下就把那一句交出去，不必再按送出', async () => {
    const wrapper = mount(AssistantSuggestedPrompts, { props: { prompts: SUGGESTED_PROMPTS } })

    await wrapper.findAll('[data-testid="assistant-suggested-prompt"]')[1]?.trigger('click')

    expect(wrapper.emitted('select')).toEqual([[SUGGESTED_PROMPTS[1]]])
  })
})
