import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppSwitch from '~/components/atoms/AppSwitch.vue'

function mountSwitch(modelValue: boolean, disabled = false) {
  return mount(AppSwitch, {
    props: { 'modelValue': modelValue, 'label': '現貨／合約', disabled, 'onUpdate:modelValue': () => {} },
    slots: { off: '現貨', on: '合約' },
  })
}

describe('AppSwitch', () => {
  it.each([
    { name: '關著時按一下就打開', modelValue: false, expected: true },
    { name: '開著時按一下就關上', modelValue: true, expected: false },
  ])('$name', async ({ modelValue, expected }) => {
    const wrapper = mountSwitch(modelValue)

    await wrapper.get('[role="switch"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[expected]])
  })

  it('按不動的時候不改變任何東西', async () => {
    const wrapper = mountSwitch(false, true)

    await wrapper.get('[role="switch"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.get('[role="switch"]').attributes('aria-disabled')).toBe('true')
  })

  it('說出現在是開著還是關著', () => {
    expect(mountSwitch(true).get('[role="switch"]').attributes('aria-checked')).toBe('true')
    expect(mountSwitch(false).get('[role="switch"]').attributes('aria-checked')).toBe('false')
  })
})
