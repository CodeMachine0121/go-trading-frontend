import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FormField from '~/components/molecules/FormField.vue'

describe('FormField', () => {
  it('只有標籤時不顯示說明也不顯示錯誤', () => {
    const wrapper = mount(FormField, {
      props: { label: '交易標的' },
      slots: { default: '<input>' },
    })

    expect(wrapper.get('.form-field__label').text()).toBe('交易標的')
    expect(wrapper.find('.form-field__hint').exists()).toBe(false)
    expect(wrapper.find('[data-testid="field-error"]').exists()).toBe(false)
  })

  it('有說明時顯示說明', () => {
    const wrapper = mount(FormField, {
      props: { label: '開始時間', hint: '世界標準時間（UTC）' },
    })

    expect(wrapper.get('.form-field__hint').text()).toBe('世界標準時間（UTC）')
  })

  it('有錯誤時以錯誤取代說明', () => {
    const wrapper = mount(FormField, {
      props: { label: '交易標的', hint: '例如 BTCUSDT', errorMessage: '請指定交易標的' },
    })

    expect(wrapper.get('[data-testid="field-error"]').text()).toBe('請指定交易標的')
    expect(wrapper.find('.form-field__hint').exists()).toBe(false)
  })
})
