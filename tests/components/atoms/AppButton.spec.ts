import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppButton from '~/components/atoms/AppButton.vue'

describe('AppButton', () => {
  it('有文字時不需要另外命名', () => {
    const wrapper = mount(AppButton, { slots: { default: '執行計算' } })

    expect(wrapper.text()).toBe('執行計算')
    expect(wrapper.attributes('aria-label')).toBeUndefined()
  })

  it('只放圖示時，按鈕自己說得出它叫什麼', () => {
    // 一顆只有圖示的按鈕，對讀螢幕的人來說什麼都沒說；
    // 對看得到但不確定那個圖示意思的人也一樣，所以提示也要有。
    const wrapper = mount(AppButton, {
      props: { label: '儲存' },
      slots: { default: '<svg />' },
    })

    expect(wrapper.attributes('aria-label')).toBe('儲存')
    expect(wrapper.attributes('title')).toBe('儲存')
  })

  it('長相由使用端決定，不另外長出一個元件', () => {
    const wrapper = mount(AppButton, { props: { variant: 'danger', size: 'small' } })

    expect(wrapper.classes()).toContain('app-button--danger')
    expect(wrapper.classes()).toContain('app-button--small')
  })
})
