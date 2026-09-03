import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppPanel from '~/components/atoms/AppPanel.vue'

describe('AppPanel', () => {
  it('呈現標題與內容', () => {
    const wrapper = mount(AppPanel, {
      props: { title: '查詢結果' },
      slots: { default: '<p data-testid="content">兩百根</p>' },
    })

    expect(wrapper.get('h2').text()).toBe('查詢結果')
    expect(wrapper.get('[data-testid="content"]').text()).toBe('兩百根')
  })

  it.each([
    ['標題', { title: '查詢結果' }, {}],
    ['附註', {}, { meta: '<span>共 3 根</span>' }],
    ['動作', {}, { actions: '<button>重新檢查</button>' }],
  ])('有%s就有標題列', (_label, props, slots) => {
    const wrapper = mount(AppPanel, { props, slots })

    expect(wrapper.find('header').exists()).toBe(true)
  })

  it('三樣都沒有就不畫標題列——一條空的窄帶只是在浪費高度', () => {
    const wrapper = mount(AppPanel, { slots: { default: '<p>只有內容</p>' } })

    expect(wrapper.find('header').exists()).toBe(false)
  })

  it('沒有給收尾那一條就不畫它', () => {
    const withoutFooter = mount(AppPanel, { props: { title: '圖' } })
    const withFooter = mount(AppPanel, {
      props: { title: '圖' },
      slots: { footer: '<span data-testid="covered">涵蓋一整天</span>' },
    })

    expect(withoutFooter.find('footer').exists()).toBe(false)
    expect(withFooter.get('[data-testid="covered"]').text()).toBe('涵蓋一整天')
  })
})
