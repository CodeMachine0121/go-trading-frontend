import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AccountProfilePanel from '~/components/organisms/AccountProfilePanel.vue'

describe('AccountProfilePanel', () => {
  it('顯示目前登入者的電子郵件', () => {
    const wrapper = mount(AccountProfilePanel, { props: { email: 'james@example.com' } })

    expect(wrapper.get('[data-testid="account-email"]').text()).toBe('james@example.com')
  })

  it('密碼那一格是一排點，而且直說為什麼', () => {
    // 留一個空格或一句「無法取得」，看起來就像畫面壞了——而它沒有壞：
    // 這個系統從來沒有留著密碼。
    const wrapper = mount(AccountProfilePanel, { props: { email: 'james@example.com' } })

    expect(wrapper.get('[data-testid="account-password-mask"]').text()).not.toContain('correct')
    expect(wrapper.text()).toContain('密碼不會顯示，只能更換')
  })

  it('遮住的位數不跟著真實長度走', () => {
    // 跟著走等於把密碼有幾個字說出去。
    const wrapper = mount(AccountProfilePanel, { props: { email: 'james@example.com' } })

    expect(wrapper.get('[data-testid="account-password-mask"]').text()).toBe('••••••••')
  })

  it('還不知道是誰的時候不留白', () => {
    const wrapper = mount(AccountProfilePanel, { props: { email: null } })

    expect(wrapper.get('[data-testid="account-email"]').text()).toBe('—')
  })

  it.each([
    { activated: true, shown: true },
    { activated: false, shown: false },
  ])('開通了才標「已開通」（activated=$activated）', ({ activated, shown }) => {
    const wrapper = mount(AccountProfilePanel, { props: { email: 'james@example.com', activated } })

    expect(wrapper.find('[data-testid="account-activated"]').exists()).toBe(shown)
  })

  it('按登出就往上說要登出', async () => {
    // 窄螢幕上沒有側欄，這一顆是那裡唯一的登出。
    const wrapper = mount(AccountProfilePanel, { props: { email: 'james@example.com' } })

    await wrapper.get('[data-testid="account-sign-out"]').trigger('click')

    expect(wrapper.emitted('signOut')).toHaveLength(1)
  })
})
