import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'

describe('ConsoleLayout', () => {
  it('呈現標題與內容插槽', () => {
    const wrapper = mount(ConsoleLayout, {
      props: { title: 'K 線瀏覽' },
      slots: { default: '<p data-testid="content">內容</p>' },
      global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
    })

    expect(wrapper.get('h1').text()).toBe('K 線瀏覽')
    expect(wrapper.get('[data-testid="content"]').text()).toBe('內容')
  })

  it('提供各畫面之間的導覽', () => {
    const wrapper = mount(ConsoleLayout, {
      props: { title: '連線狀態' },
      global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
    })

    expect(wrapper.text()).toContain('連線狀態')
    expect(wrapper.text()).toContain('K 線瀏覽')
    expect(wrapper.text()).toContain('K 線圖表')
    expect(wrapper.text()).toContain('指標計算')
  })

  it('頂欄留一個位置給時區選單', () => {
    const wrapper = mount(ConsoleLayout, {
      props: { title: 'K 線瀏覽' },
      slots: { timezone: '<span data-testid="time-zone">台北（UTC+08:00）</span>' },
      global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
    })

    expect(wrapper.get('[data-testid="time-zone"]').text()).toBe('台北（UTC+08:00）')
  })
})
