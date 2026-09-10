import { describe, expect, it } from 'vitest'
import { PasswordChangeDomain } from '~/domain/models/domains/password-change-domain'
import { PasswordChangeDto } from '~/domain/models/dto/password-change-dto'

function passwordChange(
  currentPassword: string, newPassword: string, newPasswordConfirmation = newPassword,
) {
  return new PasswordChangeDomain(
    new PasswordChangeDto(currentPassword, newPassword, newPasswordConfirmation))
}

describe('PasswordChangeDomain', () => {
  it('三格都填對就送得出去', () => {
    const passwordChangeDomain = passwordChange('correct horse', 'battery staple')

    expect(passwordChangeDomain.isSubmittable()).toBe(true)
    expect(passwordChangeDomain.fieldErrors().currentPassword).toBeNull()
    expect(passwordChangeDomain.fieldErrors().newPassword).toBeNull()
    expect(passwordChangeDomain.fieldErrors().newPasswordConfirmation).toBeNull()
  })

  it('送出去的密碼一個字都不動——空白是密碼的一部分', () => {
    // 去掉它的話，今天設得起來的密碼明天就登不進去。
    const passwordChangeDomain = passwordChange('  old spaces  ', '  new spaces  ')

    expect(passwordChangeDomain.currentPasswordValue()).toBe('  old spaces  ')
    expect(passwordChangeDomain.newPasswordValue()).toBe('  new spaces  ')
  })

  it.each([
    ['沒填', '', '請填入目前的密碼'],
  ])('目前的密碼%s時說在那一格', (_situation, currentPassword, expectedMessage) => {
    const passwordChangeDomain = passwordChange(currentPassword, 'battery staple')

    expect(passwordChangeDomain.isSubmittable()).toBe(false)
    expect(passwordChangeDomain.fieldErrors().currentPassword).toBe(expectedMessage)
  })

  it('目前的密碼不套用長度規則', () => {
    // 那些規則管的是密碼設得成什麼樣，不是它現在對不對。套用的話，一位密碼確實比較短的
    // 既有使用者會被告知自己格式填錯，而他打的其實完全正確。
    const passwordChangeDomain = passwordChange('old', 'battery staple')

    expect(passwordChangeDomain.fieldErrors().currentPassword).toBeNull()
    expect(passwordChangeDomain.isSubmittable()).toBe(true)
  })

  it.each([
    ['沒填', '', '請填入新的密碼'],
    ['只有 7 個字元', '1234567', '密碼至少要 8 個字元'],
    ['25 個中文字（75 個位元組）', '密'.repeat(25), '密碼長度上限為 72 個位元組（中文字一個算三個）'],
  ])('新的密碼%s時說在那一格', (_situation, newPassword, expectedMessage) => {
    const passwordChangeDomain = passwordChange('correct horse', newPassword)

    expect(passwordChangeDomain.isSubmittable()).toBe(false)
    expect(passwordChangeDomain.fieldErrors().newPassword).toBe(expectedMessage)
  })

  it.each([
    ['剛好 8 個字元', '12345678'],
    ['剛好 24 個中文字（72 個位元組）', '密'.repeat(24)],
  ])('新的密碼%s是可以的', (_situation, newPassword) => {
    expect(passwordChange('correct horse', newPassword).isSubmittable()).toBe(true)
  })

  it('新的與目前那一組一樣時擋下來', () => {
    // 換一組一模一樣的密碼是一次什麼都沒發生的操作，而使用者會以為自己換過了。
    const passwordChangeDomain = passwordChange('correct horse', 'correct horse')

    expect(passwordChangeDomain.isSubmittable()).toBe(false)
    expect(passwordChangeDomain.fieldErrors().newPassword).toBe('新密碼不得與目前的密碼相同')
  })

  it('只差一個大寫就是另一組密碼', () => {
    expect(passwordChange('correct horse', 'Correct horse').isSubmittable()).toBe(true)
  })

  it('太短又剛好與目前相同時，先說太短', () => {
    // 兩個都要改的時候，先說那個不論如何都得改的。
    const passwordChangeDomain = passwordChange('short', 'short')

    expect(passwordChangeDomain.fieldErrors().newPassword).toBe('密碼至少要 8 個字元')
  })

  it.each([
    ['沒填', '', '請再打一次新的密碼'],
    ['與新的那一格不一樣', 'battery stapel', '兩次輸入的新密碼不一致'],
  ])('再打一次%s時說在那一格', (_situation, confirmation, expectedMessage) => {
    // 這一條**只有畫面這一側守得住**：後端只收得到一組新密碼，看不出使用者打錯了第二次。
    const passwordChangeDomain = passwordChange('correct horse', 'battery staple', confirmation)

    expect(passwordChangeDomain.isSubmittable()).toBe(false)
    expect(passwordChangeDomain.fieldErrors().newPasswordConfirmation).toBe(expectedMessage)
  })

  it('三格都不對時一次說完三則，不是改好一格再被念一次', () => {
    const fieldErrors = passwordChange('', '1234567', '').fieldErrors()

    expect(fieldErrors.currentPassword).not.toBeNull()
    expect(fieldErrors.newPassword).not.toBeNull()
    expect(fieldErrors.newPasswordConfirmation).not.toBeNull()
  })
})
