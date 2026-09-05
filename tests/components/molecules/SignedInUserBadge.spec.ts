import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SignedInUserBadge from '~/components/molecules/SignedInUserBadge.vue'
import { SignedInUserDto } from '~/domain/models/dto/signed-in-user-dto'

function mountBadge(email = 'james@example.com') {
  return mount(SignedInUserBadge, { props: { user: new SignedInUserDto(7, email) } })
}

describe('SignedInUserBadge：側欄底下那一行', () => {
  it('寫著現在是誰在用', () => {
    expect(mountBadge().find('[data-testid="signed-in-email"]').text()).toBe('james@example.com')
  })

  it('太長的電子郵件會被截斷，但停在上面仍然看得到全文', () => {
    // 側欄只有三公分寬，而電子郵件常常比它長。截斷是為了不撐爆版面；
    // 留著 title 是為了「我登入的到底是哪一個帳號」仍然答得出來。
    const longEmail = 'a-very-long-address-indeed@example.com'

    expect(mountBadge(longEmail).find('[data-testid="signed-in-email"]').attributes('title'))
      .toBe(longEmail)
  })

  it('按下那顆鍵就說一聲要離開', async () => {
    const wrapper = mountBadge()

    await wrapper.find('[data-testid="sign-out"]').trigger('click')

    expect(wrapper.emitted('signOut')).toHaveLength(1)
  })
})
