// @vitest-environment nuxt
// 樣板記著「側欄收起來了沒有」，而那份記憶要跨畫面活著（`useState`）——
// 需要 Nuxt runtime 才問得到它。
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'

function mountLayout(title = 'K 線瀏覽') {
  return mount(ConsoleLayout, {
    props: { title },
    global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
  })
}

describe('ConsoleLayout', () => {
  // 側欄收起來與否是**跨畫面共用**的一份狀態，所以它活得比任何一次掛載久——
  // 每個案例都從「側欄開著」開始，才不會讀到上一個案例按過的那一下。
  beforeEach(() => {
    clearNuxtState()
  })

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

  it('側欄收得起來，而且收起來之後五個畫面都還在', () => {
    // 收起來的是那幾個字，不是那幾個地方——整條藏起來會逼使用者為了回去而先展開。
    const wrapper = mountLayout('K 線圖表')

    wrapper.get('[data-testid="toggle-rail"]').trigger('click')

    // 名字仍然在 DOM 裡（只是看不見）：拿掉它們，讀螢幕的人聽到的
    // 就是五條沒有名字的連結，而那條側欄等於壞了。
    expect(wrapper.findAll('a')).toHaveLength(5)
    expect(wrapper.text()).toContain('指標計算')
  })

  it('收起來的側欄在走到下一個畫面時不會自己彈回來', async () => {
    // 每換一個畫面，樣板就重新掛載一次。收起側欄的人是為了讓工作區寬一點，
    // 那個理由不會因為他走去看另一張表就消失。
    const onOneScreen = mountLayout('K 線圖表')
    await onOneScreen.get('[data-testid="toggle-rail"]').trigger('click')
    onOneScreen.unmount()

    const onTheNextScreen = mountLayout('指標計算')

    expect(onTheNextScreen.get('[data-testid="toggle-rail"]').attributes('aria-label'))
      .toBe('展開側欄')
  })

  it('收起來那顆鍵自己說它要做哪一件事', async () => {
    const wrapper = mountLayout('K 線圖表')

    expect(wrapper.get('[data-testid="toggle-rail"]').attributes('aria-label')).toBe('收起側欄')

    await wrapper.get('[data-testid="toggle-rail"]').trigger('click')

    expect(wrapper.get('[data-testid="toggle-rail"]').attributes('aria-label')).toBe('展開側欄')
  })

  it.each([
    ['時區選單', 'timezone', 'time-zone', '台北（UTC+08:00）'],
    ['後端狀態那顆燈', 'status', 'status', '可用'],
  ])('外框留一個位置給%s', (_label, slotName, testId, content) => {
    const wrapper = mount(ConsoleLayout, {
      props: { title: 'K 線瀏覽' },
      slots: { [slotName]: `<span data-testid="${testId}">${content}</span>` },
      global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
    })

    expect(wrapper.get(`[data-testid="${testId}"]`).text()).toBe(content)
  })
})
