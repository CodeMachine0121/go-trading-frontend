// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { PasswordChangeFieldError } from '~/domain/errors/password-change-field-error'
import { PasswordChangeFieldErrorsDto } from '~/domain/models/dto/password-change-field-errors-dto'
import { CurrentPasswordRejectedError } from '~/domain/errors/current-password-rejected-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { SignedInUserDto } from '~/domain/models/dto/signed-in-user-dto'

// 工廠會被提升，所以它要用到的東西也得跟著提升。
const { navigateToSpy } = vi.hoisted(() => ({
  navigateToSpy: vi.fn<(path: string) => string>(path => path),
}))

mockNuxtImport('navigateTo', () => navigateToSpy)

const passwordChangeApplication = { changePassword: vi.fn() }

/**
 * 「現在是誰在用」那一份的替身。它只要說得出 signOutAfterPasswordChange 有沒有被叫到，
 * 以及那一支底下是不是真的去忘掉了記著的那一對。
 */
const userSessionApplicationStub = { forgetSession: vi.fn(), signOut: vi.fn() }

/** 替身從參數進去，不去換掉 useNuxtApp——換掉它會連路由同步一起弄壞。 */
function passwordChangeUnderTest() {
  return usePasswordChange(
    passwordChangeApplication as unknown as Parameters<typeof usePasswordChange>[0],
    useUserSession(
      userSessionApplicationStub as unknown as Parameters<typeof useUserSession>[0]),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  navigateToSpy.mockImplementation((path: string) => path)
  passwordChangeApplication.changePassword.mockResolvedValue(undefined)
  userSessionApplicationStub.forgetSession.mockReturnValue(undefined)
  useState<SignedInUserDto | null>('user-session', () => null).value
    = new SignedInUserDto(7, 'james@example.com', true, null)
  useState<string | null>('user-session-sign-in-notice', () => null).value = null
  useState<Promise<void> | null>('user-session-restoration', () => null).value = null
})

describe('usePasswordChange', () => {
  it('三格往下送', async () => {
    const { submitPasswordChange } = passwordChangeUnderTest()

    await submitPasswordChange('correct horse', 'battery staple', 'battery staple')

    expect(passwordChangeApplication.changePassword)
      .toHaveBeenCalledWith('correct horse', 'battery staple', 'battery staple')
  })

  it('換好之後先留下一句話，再把人帶回登入畫面', async () => {
    // 不說一聲就把人踢回去，看起來像換失敗了——而他其實已經換好了。
    const { submitPasswordChange } = passwordChangeUnderTest()

    await submitPasswordChange('correct horse', 'battery staple', 'battery staple')

    expect(useState<string | null>('user-session-sign-in-notice').value)
      .toBe('密碼已更換，請用新密碼重新登入。')
    expect(navigateToSpy).toHaveBeenCalledWith('/login')
  })

  it('換好之後這台就不再記得是誰在用', async () => {
    const { submitPasswordChange } = passwordChangeUnderTest()

    await submitPasswordChange('correct horse', 'battery staple', 'battery staple')

    expect(useState<SignedInUserDto | null>('user-session').value).toBeNull()
  })

  it('換好之後記著的那一對憑證也被忘掉', async () => {
    // 留著的話，下一次換頁時把關會拿兩份已經不算數的憑證去敲兩次門才放棄，
    // 而那段時間畫面說不清楚自己是誰。
    const { submitPasswordChange } = passwordChangeUnderTest()

    await submitPasswordChange('correct horse', 'battery staple', 'battery staple')

    expect(userSessionApplicationStub.forgetSession).toHaveBeenCalledOnce()
  })

  it('忘掉是本機的事——它不去敲那扇已經鎖上的門', async () => {
    // 後端已經把每一段都撤掉了，再送一次撤銷是拿一份不算數的續用憑證去敲門。
    const { submitPasswordChange } = passwordChangeUnderTest()

    await submitPasswordChange('correct horse', 'battery staple', 'battery staple')

    expect(userSessionApplicationStub.signOut).not.toHaveBeenCalled()
  })

  it('連按兩下只送出一次', async () => {
    // 第二次帶的是已經失效的舊密碼，使用者會看到「目前的密碼不正確」，
    // 而他的密碼其實已經換好了。
    let releaseChange = (): void => {}
    passwordChangeApplication.changePassword.mockReturnValue(
      new Promise<void>((resolve) => { releaseChange = resolve }))
    const { submitPasswordChange, pending } = passwordChangeUnderTest()

    const firstSubmission = submitPasswordChange('correct horse', 'battery staple', 'battery staple')
    expect(pending.value).toBe(true)
    await submitPasswordChange('correct horse', 'battery staple', 'battery staple')

    expect(passwordChangeApplication.changePassword).toHaveBeenCalledTimes(1)

    releaseChange()
    await firstSubmission
    expect(pending.value).toBe(false)
  })

  it('畫面自己擋下來的原因掛回逐格', async () => {
    passwordChangeApplication.changePassword.mockRejectedValue(
      new PasswordChangeFieldError(
        new PasswordChangeFieldErrorsDto(null, null, '兩次輸入的新密碼不一致')))
    const { submitPasswordChange, fieldErrors, errorMessage } = passwordChangeUnderTest()

    await submitPasswordChange('correct horse', 'battery staple', 'battery stapel')

    expect(fieldErrors.value?.newPasswordConfirmation).toBe('兩次輸入的新密碼不一致')
    expect(errorMessage.value).toBeNull()
    expect(navigateToSpy).not.toHaveBeenCalled()
  })

  it('目前的密碼不正確掛在那一格，而且不把人趕回登入畫面', async () => {
    // 這一段登入好得很，錯的只是一格。
    passwordChangeApplication.changePassword.mockRejectedValue(
      new CurrentPasswordRejectedError('目前的密碼不正確'))
    const { submitPasswordChange, fieldErrors } = passwordChangeUnderTest()

    await submitPasswordChange('wrong horse', 'battery staple', 'battery staple')

    expect(fieldErrors.value?.currentPassword).toBe('目前的密碼不正確')
    expect(fieldErrors.value?.newPassword).toBeNull()
    expect(navigateToSpy).not.toHaveBeenCalled()
  })

  it('後端擋下來的其他規則掛到「新的密碼」那一格，不猜是哪一條', async () => {
    passwordChangeApplication.changePassword.mockRejectedValue(
      new BackendRequestRejectedError('密碼至少要 8 個字元', { status: 400 }))
    const { submitPasswordChange, fieldErrors } = passwordChangeUnderTest()

    await submitPasswordChange('correct horse', 'short', 'short')

    expect(fieldErrors.value?.newPassword).toBe('密碼至少要 8 個字元')
  })

  it('連不上後端時說的是整張卡的話，不是某一格的', async () => {
    passwordChangeApplication.changePassword.mockRejectedValue(
      new BackendUnreachableError('http://localhost:8080/users/me/password'))
    const { submitPasswordChange, fieldErrors, errorMessage } = passwordChangeUnderTest()

    await submitPasswordChange('correct horse', 'battery staple', 'battery staple')

    expect(fieldErrors.value).toBeNull()
    expect(errorMessage.value).toContain('連不上後端 go-trading API')
  })

  it('沒見過的失敗也說得出一句話，不是一片空白', async () => {
    passwordChangeApplication.changePassword.mockRejectedValue(new Error('something new'))
    const { submitPasswordChange, errorMessage } = passwordChangeUnderTest()

    await submitPasswordChange('correct horse', 'battery staple', 'battery staple')

    expect(errorMessage.value).toBe('更換密碼時發生未預期的錯誤。')
  })

  it('動了那幾格就把上一次的說明清掉', async () => {
    passwordChangeApplication.changePassword.mockRejectedValue(
      new CurrentPasswordRejectedError('目前的密碼不正確'))
    const { submitPasswordChange, fieldErrors, clearFeedback } = passwordChangeUnderTest()
    await submitPasswordChange('wrong horse', 'battery staple', 'battery staple')

    clearFeedback()

    expect(fieldErrors.value).toBeNull()
  })
})
