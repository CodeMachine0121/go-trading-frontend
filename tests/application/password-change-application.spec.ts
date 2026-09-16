import { describe, expect, it, vi } from 'vitest'
import type { IUserProxy } from '~/domain/interface/i-user-proxy'
import { PasswordChangeApplication } from '~/application/password-change-application'
import { PasswordChangeService } from '~/domain/service/password-change-service'
import { PasswordChangeFieldError } from '~/domain/errors/password-change-field-error'
import { CurrentPasswordRejectedError } from '~/domain/errors/current-password-rejected-error'

/**
 * 注入**真實的** domain service 與 domain model，只 mock 最外層的 proxy——
 * 於是這一份也連帶測到那四條規則住在哪裡。
 */
function buildFixture(changePassword = vi.fn().mockResolvedValue(undefined)) {
  const userProxy = { changePassword } as unknown as IUserProxy

  return {
    application: new PasswordChangeApplication(new PasswordChangeService(userProxy)),
    changePassword,
  }
}

describe('PasswordChangeApplication.changePassword', () => {
  it('三格都對就把兩組密碼送去後端', () => {
    const { application, changePassword } = buildFixture()

    return application.changePassword('correct horse', 'battery staple', 'battery staple')
      .then(() => {
        expect(changePassword).toHaveBeenCalledWith('correct horse', 'battery staple')
      })
  })

  it('兩次新密碼不一致時根本不送出', async () => {
    // 這一條只有畫面這一側守得住：後端只收得到一組新密碼。
    const { application, changePassword } = buildFixture()

    const failure = await application
      .changePassword('correct horse', 'battery staple', 'battery stapel')
      .catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(PasswordChangeFieldError)
    expect((failure as PasswordChangeFieldError).fieldErrors.newPasswordConfirmation)
      .toBe('兩次輸入的新密碼不一致')
    expect(changePassword).not.toHaveBeenCalled()
  })

  it.each([
    ['新密碼太短', 'correct horse', '1234567'],
    ['新密碼與目前相同', 'correct horse', 'correct horse'],
    ['目前的密碼沒填', '', 'battery staple'],
  ])('%s時也不送出，說明帶著逐格的原因回來', async (_situation, currentPassword, newPassword) => {
    const { application, changePassword } = buildFixture()

    const failure = await application
      .changePassword(currentPassword, newPassword, newPassword)
      .catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(PasswordChangeFieldError)
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('後端說目前的密碼不正確時，原樣把那一種拋出去', async () => {
    // 畫面要據它把說明掛回那一格，而不是把人帶回登入畫面。
    const rejection = new CurrentPasswordRejectedError('目前的密碼不正確')
    const { application } = buildFixture(vi.fn().mockRejectedValue(rejection))

    await expect(application.changePassword('wrong horse', 'battery staple', 'battery staple'))
      .rejects.toBe(rejection)
  })
})
