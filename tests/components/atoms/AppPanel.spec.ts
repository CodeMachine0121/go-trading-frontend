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

  it('不說收得起來就沒有那顆鍵——多數面板本來就該一直開著', () => {
    const wrapper = mount(AppPanel, {
      props: { title: '查詢結果' },
      slots: { default: '<p data-testid="content">兩百根</p>' },
    })

    expect(wrapper.find('[data-testid="toggle-panel"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="content"]').exists()).toBe(true)
  })

  it('收得起來的面板按一下收掉內容，再按一下拿回來', async () => {
    const wrapper = mount(AppPanel, {
      props: { title: '看什麼', collapsible: true },
      slots: {
        default: '<p data-testid="content">控制項</p>',
        footer: '<span data-testid="note">涵蓋一整天</span>',
      },
    })

    await wrapper.get('[data-testid="toggle-panel"]').trigger('click')

    // 收起來時內容整塊不畫：留著它，鍵盤焦點會掉進一塊已經收起來的東西裡。
    expect(wrapper.find('[data-testid="content"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="note"]').exists()).toBe(false)
    // 那條窄帶留著——不然就沒有地方可以再把它打開了。
    expect(wrapper.get('h2').text()).toBe('看什麼')

    await wrapper.get('[data-testid="toggle-panel"]').trigger('click')

    expect(wrapper.get('[data-testid="content"]').text()).toBe('控制項')
  })

  it('收起來或展開，讀螢幕的人也聽得出來', async () => {
    const wrapper = mount(AppPanel, {
      props: { title: '看什麼', collapsible: true },
      slots: { default: '<p>控制項</p>' },
    })

    expect(wrapper.get('[data-testid="toggle-panel"]').attributes('aria-expanded')).toBe('true')

    await wrapper.get('[data-testid="toggle-panel"]').trigger('click')

    expect(wrapper.get('[data-testid="toggle-panel"]').attributes('aria-expanded')).toBe('false')
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

  describe('一打開就已經收著', () => {
    it.each([
      ['收著', true, false],
      ['開著', false, true],
    ])('環境說它該是%s的', (_label, initiallyCollapsed, contentIsRendered) => {
      const wrapper = mount(AppPanel, {
        props: { title: '看什麼', collapsible: true, initiallyCollapsed },
        slots: { default: '<p data-testid="content">交易標的</p>' },
      })

      expect(wrapper.find('[data-testid="content"]').exists()).toBe(contentIsRendered)
    })

    it('收不起來的面板不會因為環境的一句話就消失', () => {
      // 這句話說的是「一開始收著」，而一塊收不起來的面板從來就沒有「收著」這個狀態。
      const wrapper = mount(AppPanel, {
        props: { title: '查詢結果', initiallyCollapsed: true },
        slots: { default: '<p data-testid="content">兩百根</p>' },
      })

      expect(wrapper.find('[data-testid="content"]').exists()).toBe(true)
    })

    it('環境晚一步才說話，還沒動過手的面板跟著改', async () => {
      // 伺服器端量不到視窗，第一次畫出來的一律是寬螢幕那一版；
      // 到了瀏覽器才知道這是一支手機，那一次補正必須發生。
      const wrapper = mount(AppPanel, {
        props: { title: '看什麼', collapsible: true, initiallyCollapsed: false },
        slots: { default: '<p data-testid="content">交易標的</p>' },
      })

      await wrapper.setProps({ initiallyCollapsed: true })

      expect(wrapper.find('[data-testid="content"]').exists()).toBe(false)
    })

    it('自己按過之後，環境再說什麼都不算數', async () => {
      // 他的手比環境的猜測大。手機轉橫再轉直，環境會前後說兩次話，
      // 而他在那之前已經親手把它打開了——那一下不該被任何一句蓋掉。
      const wrapper = mount(AppPanel, {
        props: { title: '看什麼', collapsible: true, initiallyCollapsed: true },
        slots: { default: '<p data-testid="content">交易標的</p>' },
      })

      await wrapper.get('[data-testid="toggle-panel"]').trigger('click')

      await wrapper.setProps({ initiallyCollapsed: false })
      await wrapper.setProps({ initiallyCollapsed: true })

      expect(wrapper.find('[data-testid="content"]').exists()).toBe(true)
    })
  })
})
