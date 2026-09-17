import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppRadio from '~/components/atoms/AppRadio.vue'

function mountRadio(overrides: Partial<{
  modelValue: string
  value: string
  label: string
  description: string
  disabled: boolean
}> = {}) {
  return mount(AppRadio, {
    props: {
      modelValue: overrides.modelValue ?? '',
      value: overrides.value ?? 'spot',
      label: overrides.label ?? '現貨',
      name: 'a-group',
      description: overrides.description,
      disabled: overrides.disabled,
    },
  })
}

describe('AppRadio', () => {
  it('挑中的那一顆看得出來被挑中', () => {
    const wrapper = mountRadio({ modelValue: 'spot', value: 'spot' })

    expect(wrapper.get<HTMLInputElement>('input').element.checked).toBe(true)
  })

  it('沒挑中的那一顆不會看起來被挑中', () => {
    const wrapper = mountRadio({ modelValue: 'longShort', value: 'spot' })

    expect(wrapper.get<HTMLInputElement>('input').element.checked).toBe(false)
  })

  it('挑了它就把自己的值往上帶', async () => {
    const wrapper = mountRadio({ modelValue: 'longShort', value: 'spot' })

    await wrapper.get('input').setValue()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['spot'])
  })

  it('那一行說明看得見', () => {
    // 並排的選項之所以不做成下拉選單，就是因為選項本身需要解釋。
    const wrapper = mountRadio({ description: '賣出就平倉、把錢收回來。' })

    expect(wrapper.text()).toContain('賣出就平倉、把錢收回來。')
  })

  it('沒有說明時不留下一個空著的位置', () => {
    const wrapper = mountRadio()

    expect(wrapper.find('.app-radio__description').exists()).toBe(false)
  })

  it('停用時挑不動', () => {
    const wrapper = mountRadio({ disabled: true })

    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
  })

  it('同一組共用一個名字，瀏覽器才知道它們互斥', () => {
    const wrapper = mountRadio()

    expect(wrapper.get('input').attributes('name')).toBe('a-group')
  })
})
