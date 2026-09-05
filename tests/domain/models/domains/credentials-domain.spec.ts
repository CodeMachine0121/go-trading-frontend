import { describe, expect, it } from 'vitest'
import { CredentialsDomain } from '~/domain/models/domains/credentials-domain'
import { CredentialsDto } from '~/domain/models/dto/credentials-dto'
import type { SignInMode } from '~/domain/models/vo/sign-in-mode'

function credentialsOf(email: string, password: string, mode: SignInMode): CredentialsDomain {
  return new CredentialsDomain(new CredentialsDto(email, password, mode))
}

describe('CredentialsDomain：兩格都填了才送得出去', () => {
  it.each([
    { name: '兩格都填好', email: 'james@example.com', password: 'correct horse' },
    { name: '電子郵件前後有空白', email: '  james@example.com  ', password: 'correct horse' },
  ])('$name（登入）', ({ email, password }) => {
    const credentials = credentialsOf(email, password, 'signIn')

    expect(credentials.isSubmittable()).toBe(true)
    expect(credentials.fieldErrors().email).toBeNull()
    expect(credentials.fieldErrors().password).toBeNull()
  })

  it('送出去的電子郵件不帶前後空白', () => {
    const credentials = credentialsOf('  james@example.com  ', 'correct horse', 'signIn')

    expect(credentials.emailValue()).toBe('james@example.com')
  })

  it('密碼一個字都不動——空白是密碼的一部分', () => {
    const credentials = credentialsOf('james@example.com', '  spaced  ', 'signIn')

    expect(credentials.passwordValue()).toBe('  spaced  ')
  })

  it.each([
    { name: '電子郵件是空的', email: '', password: 'correct horse' },
    { name: '電子郵件只有空白', email: '   ', password: 'correct horse' },
  ])('$name 就不送出', ({ email, password }) => {
    const credentials = credentialsOf(email, password, 'signIn')

    expect(credentials.isSubmittable()).toBe(false)
    expect(credentials.fieldErrors().email).toContain('電子郵件')
    expect(credentials.fieldErrors().password).toBeNull()
  })

  it('密碼是空的就不送出', () => {
    const credentials = credentialsOf('james@example.com', '', 'signIn')

    expect(credentials.isSubmittable()).toBe(false)
    expect(credentials.fieldErrors().password).toContain('密碼')
    expect(credentials.fieldErrors().email).toBeNull()
  })

  it('兩格都空著就兩格各自都說一次——改好一格不該再被念一次', () => {
    const credentials = credentialsOf('', '', 'signIn')

    expect(credentials.fieldErrors().email).not.toBeNull()
    expect(credentials.fieldErrors().password).not.toBeNull()
  })
})

describe('CredentialsDomain：密碼的長度規則只在建立帳號時套用', () => {
  it.each([
    { name: '剛好 8 個字元', password: '12345678' },
    { name: '剛好 72 個位元組', password: 'a'.repeat(72) },
    { name: '二十四個中文字剛好 72 個位元組', password: '密'.repeat(24) },
  ])('建立帳號：$name 送得出去', ({ password }) => {
    const credentials = credentialsOf('james@example.com', password, 'register')

    expect(credentials.isSubmittable()).toBe(true)
  })

  it.each([
    { name: '少一個字元', password: '1234567', expectedFragment: '8' },
    { name: '多一個位元組', password: 'a'.repeat(73), expectedFragment: '72' },
    { name: '二十五個中文字多了三個位元組', password: '密'.repeat(25), expectedFragment: '72' },
    // 表情符號在 JavaScript 裡佔兩個「長度」，所以五個表情符號用 .length 數是十——
    // 數錯的話這一組會被放行，然後在後端被退回來，因為後端數的是字元。
    { name: '五個表情符號只有五個字元', password: '😀'.repeat(5), expectedFragment: '8' },
  ])('建立帳號：$name 就不送出', ({ password, expectedFragment }) => {
    const credentials = credentialsOf('james@example.com', password, 'register')

    expect(credentials.isSubmittable()).toBe(false)
    expect(credentials.fieldErrors().password).toContain(expectedFragment)
  })

  it.each([
    { name: '比建立時的下限短', password: '1234567' },
    { name: '比建立時的上限長', password: 'a'.repeat(73) },
  ])('登入：$name 照樣送得出去——短密碼只代表它不對，不是填錯', ({ password }) => {
    const credentials = credentialsOf('james@example.com', password, 'signIn')

    expect(credentials.isSubmittable()).toBe(true)
    expect(credentials.fieldErrors().password).toBeNull()
  })
})

describe('CredentialsDomain：電子郵件的格式交給後端判', () => {
  it.each([
    { mode: 'signIn' as const },
    { mode: 'register' as const },
  ])('看起來不像電子郵件也送得出去（$mode）', ({ mode }) => {
    // 在這裡抄一份後端的格式規則，等於多養一份遲早會漂移的規則；
    // 而格式錯的代價只是多一趟來回。
    const credentials = credentialsOf('not-an-email', 'correct horse', mode)

    expect(credentials.isSubmittable()).toBe(true)
    expect(credentials.fieldErrors().email).toBeNull()
  })
})
