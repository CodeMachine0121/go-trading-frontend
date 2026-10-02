import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import AssistantSuggestedPrompts from '~/components/molecules/AssistantSuggestedPrompts.vue'
import { SUGGESTED_PROMPTS } from '../../fixtures/assistant-conversation'

describe('AssistantSuggestedPrompts', () => {
  it('每一句都在，而且都點得動', () => {
    // 助手辦得到好幾種事而使用者從畫面上看不出來，這幾句是唯一的教學管道。
    const wrapper = mount(AssistantSuggestedPrompts, { props: { prompts: SUGGESTED_PROMPTS } })

    const prompts = wrapper.findAll('[data-testid="assistant-suggested-prompt"]')
    expect(prompts).toHaveLength(SUGGESTED_PROMPTS.length)
    expect(prompts[0]?.text()).toBe(SUGGESTED_PROMPTS[0]?.traditionalChinese)
  })

  it('點一下就把那一句交出去，不必再按送出', async () => {
    const wrapper = mount(AssistantSuggestedPrompts, { props: { prompts: SUGGESTED_PROMPTS } })

    await wrapper.findAll('[data-testid="assistant-suggested-prompt"]')[1]?.trigger('click')

    expect(wrapper.emitted('select')).toEqual([[SUGGESTED_PROMPTS[1]?.traditionalChinese]])
  })

  it('英文畫面上看到的與點下去送出的都是英文那一句', async () => {
    // 建議提問是操作台寫的話，所以跟著語言換；送出的就是使用者看到的那一句。
    const wrapper = mount(AssistantSuggestedPrompts, { props: { prompts: SUGGESTED_PROMPTS } })
    wrapper.vm.$i18n.locale = 'en'
    await nextTick()

    const prompts = wrapper.findAll('[data-testid="assistant-suggested-prompt"]')
    await prompts[0]?.trigger('click')

    expect(wrapper.text()).toContain('Try asking')
    expect(prompts[0]?.text()).toBe('Which trading symbols does the system know?')
    expect(wrapper.emitted('select')).toEqual([['Which trading symbols does the system know?']])
  })
})
