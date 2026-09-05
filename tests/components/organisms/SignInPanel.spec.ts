import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SignInPanel from '~/components/organisms/SignInPanel.vue'

function mountPanel(props: Record<string, unknown> = {}) {
  return mount(SignInPanel, { props })
}

async function fillIn(
  wrapper: ReturnType<typeof mountPanel>, email: string, password: string,
): Promise<void> {
  await wrapper.find('[data-testid="email-input"]').setValue(email)
  await wrapper.find('[data-testid="password-input"]').setValue(password)
}

describe('SignInPanel：一張卡片，兩種模式', () => {
  it('一開始是登入', () => {
    const wrapper = mountPanel()

    expect(wrapper.find('h1').text()).toBe('登入')
    expect(wrapper.find('[data-testid="submit"]').text()).toBe('登入')
  })

  it('切過去就是建立帳號', async () => {
    const wrapper = mountPanel()

    await wrapper.find('[data-testid="switch-mode"]').trigger('click')

    expect(wrapper.find('h1').text()).toBe('建立帳號')
    expect(wrapper.find('[data-testid="submit"]').text()).toBe('建立帳號')
  })

  it('切換時已經打好的內容留著——多數人是打完才發現自己按錯了那一邊', async () => {
    const wrapper = mountPanel()
    await fillIn(wrapper, 'james@example.com', 'correct horse')

    await wrapper.find('[data-testid="switch-mode"]').trigger('click')

    expect((wrapper.find('[data-testid="email-input"]').element as HTMLInputElement).value)
      .toBe('james@example.com')
    expect((wrapper.find('[data-testid="password-input"]').element as HTMLInputElement).value)
      .toBe('correct horse')
  })

  it('切換時說一聲，好讓上一次的訊息被清掉', async () => {
    const wrapper = mountPanel({ errorMessage: '電子郵件或密碼不正確' })

    await wrapper.find('[data-testid="switch-mode"]').trigger('click')

    expect(wrapper.emitted('modeChange')).toHaveLength(1)
  })
})

describe('SignInPanel：送出', () => {
  it('把兩格與目前模式一起送出去', async () => {
    const wrapper = mountPanel()
    await fillIn(wrapper, 'james@example.com', 'correct horse')

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')?.[0])
      .toEqual(['james@example.com', 'correct horse', 'signIn'])
  })

  it('切到建立帳號之後送出去的是建立帳號', async () => {
    const wrapper = mountPanel()
    await fillIn(wrapper, 'james@example.com', 'correct horse')
    await wrapper.find('[data-testid="switch-mode"]').trigger('click')

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')?.[0]?.[2]).toBe('register')
  })

  it('送出期間那顆鍵按不下去，但兩格照常打得了字', async () => {
    const wrapper = mountPanel({ pending: true })

    expect(wrapper.find('[data-testid="submit"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="email-input"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-testid="password-input"]').attributes('disabled')).toBeUndefined()
  })

  it('送出期間再送一次也不會真的送出去——連按三次不該開出三個帳號', async () => {
    const wrapper = mountPanel({ pending: true })

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('送出期間那顆鍵說得出自己正在做什麼', () => {
    expect(mountPanel({ pending: true }).find('[data-testid="submit"]').text()).toBe('登入中…')
  })

  it('建立帳號時說的是建立中，不是登入中', async () => {
    const wrapper = mountPanel()
    await wrapper.find('[data-testid="switch-mode"]').trigger('click')
    await wrapper.setProps({ pending: true })

    expect(wrapper.find('[data-testid="submit"]').text()).toBe('建立中…')
  })

  it('切過去再切回來就回到登入', async () => {
    const wrapper = mountPanel()

    await wrapper.find('[data-testid="switch-mode"]').trigger('click')
    await wrapper.find('[data-testid="switch-mode"]').trigger('click')

    expect(wrapper.find('h1').text()).toBe('登入')
  })
})

describe('SignInPanel：失敗說得出原因', () => {
  it('後端拒絕的原因寫在卡片上', () => {
    const wrapper = mountPanel({ errorMessage: '電子郵件或密碼不正確' })

    expect(wrapper.find('[data-testid="submission-error"]').text()).toContain('電子郵件或密碼不正確')
  })

  it('沒有原因時不留一塊空的訊息在那裡', () => {
    expect(mountPanel().find('[data-testid="submission-error"]').exists()).toBe(false)
  })

  it.each([
    { name: '電子郵件那一格', props: { emailError: '請填入電子郵件' }, expected: '請填入電子郵件' },
    { name: '密碼那一格', props: { passwordError: '密碼至少要 8 個字元' }, expected: '密碼至少要 8 個字元' },
  ])('$name 的原因寫在該格底下', ({ props, expected }) => {
    const wrapper = mountPanel(props)

    expect(wrapper.findAll('[data-testid="field-error"]').map(one => one.text()))
      .toContain(expected)
  })
})

describe('SignInPanel：密碼那一格是密碼', () => {
  it('打出來的字看不見', () => {
    // 這不是樣式問題：一個 type="text" 的密碼欄，會把密碼顯示在畫面上、
    // 交給瀏覽器當成一般文字記起來，也讓密碼管理器認不出它。
    expect(mountPanel().find('[data-testid="password-input"]').attributes('type'))
      .toBe('password')
  })
})
