import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PasswordChangePanel from '~/components/organisms/PasswordChangePanel.vue'

function mountPanel(props: Record<string, unknown> = {}) {
  return mount(PasswordChangePanel, { props })
}

async function fillIn(
  wrapper: ReturnType<typeof mountPanel>,
  currentPassword: string,
  newPassword: string,
  confirmation: string,
): Promise<void> {
  await wrapper.find('[data-testid="current-password-input"]').setValue(currentPassword)
  await wrapper.find('[data-testid="new-password-input"]').setValue(newPassword)
  await wrapper.find('[data-testid="new-password-confirmation-input"]').setValue(confirmation)
}

describe('PasswordChangePanel', () => {
  it('三格填好按下去，把三格原樣往上送', () => {
    // 元件不判斷任何一條規則——四條規則住在領域裡，這裡只送出去。
    const wrapper = mountPanel()

    return fillIn(wrapper, 'correct horse', 'battery staple', 'battery staple')
      .then(async () => {
        await wrapper.find('form').trigger('submit')

        expect(wrapper.emitted('submit')).toEqual([
          ['correct horse', 'battery staple', 'battery staple'],
        ])
      })
  })

  it('連按兩下只送出一次', async () => {
    // 第二次帶的是已經失效的舊密碼，使用者會看到「目前的密碼不正確」——
    // 而他的密碼其實已經換好了。
    const wrapper = mountPanel({ pending: true })
    await fillIn(wrapper, 'correct horse', 'battery staple', 'battery staple')

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.get('[data-testid="password-change-submit"]').attributes('disabled'))
      .toBeDefined()
  })

  it('送出中那顆鍵說得出自己在忙', () => {
    expect(mountPanel({ pending: true }).get('[data-testid="password-change-submit"]').text())
      .toBe('更換中…')
  })

  it.each([
    ['currentPasswordError', 'current-password-input', '目前的密碼不正確'],
    ['newPasswordError', 'new-password-input', '密碼至少要 8 個字元'],
    ['newPasswordConfirmationError', 'new-password-confirmation-input', '兩次輸入的新密碼不一致'],
  ])('%s 的說明畫在那一格底下', (propName, inputTestId, message) => {
    // 一句籠統的紅字等於要使用者自己猜是哪一格。
    const wrapper = mountPanel({ [propName]: message })

    expect(wrapper.text()).toContain(message)
    expect(wrapper.get(`[data-testid="${inputTestId}"]`).attributes('aria-invalid')).toBe('true')
  })

  it('不是某一格的錯時才用整張卡的訊息', () => {
    const wrapper = mountPanel({ errorMessage: '連不上後端 go-trading API' })

    expect(wrapper.get('[data-testid="password-change-error"]').text())
      .toContain('連不上後端 go-trading API')
  })

  it('動了任何一格就說一聲，好讓上一次的說明被清掉', async () => {
    const wrapper = mountPanel()

    await wrapper.find('[data-testid="new-password-input"]').setValue('battery staple')

    expect(wrapper.emitted('edit')).toHaveLength(1)
  })

  it('先講清楚換完之後每一台都要重新登入', () => {
    // 不說一聲就把人踢回登入畫面，看起來像換失敗了。
    expect(mountPanel().text()).toContain('每一台裝置')
  })
})
