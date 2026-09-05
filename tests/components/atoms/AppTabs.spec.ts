import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppTabs from '~/components/atoms/AppTabs.vue'

const OPTIONS = [
  { value: 'indicatorPreview', label: '指標預覽' },
  { value: 'backtest', label: '回測' },
]

function mountTabs(modelValue = 'indicatorPreview') {
  return mount(AppTabs, { props: { options: OPTIONS, modelValue } })
}

describe('AppTabs', () => {
  it('每一個選項都有一顆可以按的鍵', () => {
    const wrapper = mountTabs()

    expect(wrapper.get('[data-testid="tab-indicatorPreview"]').text()).toBe('指標預覽')
    expect(wrapper.get('[data-testid="tab-backtest"]').text()).toBe('回測')
  })

  it('選中的那一顆說得出自己被選中了', () => {
    const wrapper = mountTabs('backtest')

    expect(wrapper.get('[data-testid="tab-backtest"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('[data-testid="tab-indicatorPreview"]').attributes('aria-selected'))
      .toBe('false')
  })

  it('按下另一顆時說出換到了哪一個', async () => {
    const wrapper = mountTabs()

    await wrapper.get('[data-testid="tab-backtest"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['backtest']])
  })

  it('按下已經選中的那一顆什麼都不說', async () => {
    // 沒有換去處就沒有事情發生。使用端因此不必自己過濾「換成同一個」。
    const wrapper = mountTabs('backtest')

    await wrapper.get('[data-testid="tab-backtest"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('是切換而不是送出——按了不會把外面的表單送出去', () => {
    // 它常常擺在一份表單裡；預設的 submit 型別會讓每一次切換都送出一次。
    const wrapper = mountTabs()

    expect(wrapper.get('[data-testid="tab-backtest"]').attributes('type')).toBe('button')
  })
})
