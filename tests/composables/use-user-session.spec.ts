// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { CredentialsFieldError } from '~/domain/errors/credentials-field-error'
import { CredentialsRejectedError } from '~/domain/errors/credentials-rejected-error'
import { AccessTokenUnavailableError } from '~/domain/errors/access-token-unavailable-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { CredentialsFieldErrorsDto } from '~/domain/models/dto/credentials-field-errors-dto'
import { SignedInUserDto } from '~/domain/models/dto/signed-in-user-dto'

// 工廠會被提升，所以它要用到的東西也得跟著提升。
const { navigateToSpy } = vi.hoisted(() => ({
  navigateToSpy: vi.fn((path: string) => path),
}))

mockNuxtImport('navigateTo', () => navigateToSpy)

const userSessionApplication = {
  registerUser: vi.fn(),
  signIn: vi.fn(),
  restoreSession: vi.fn(),
  signOut: vi.fn(),
}

/**
 * 替身從參數進去，不去換掉 `useNuxtApp`——換掉它會連測試環境自己要用的
 * 路由同步一起弄壞。共用狀態（`useState`）走的是真的 Nuxt runtime。
 */
function sessionUnderTest() {
  return useUserSession(
    userSessionApplication as unknown as Parameters<typeof useUserSession>[0])
}

const SIGNED_IN_USER = new SignedInUserDto(7, 'james@example.com')

beforeEach(() => {
  vi.clearAllMocks()
  userSessionApplication.restoreSession.mockResolvedValue(null)
  // useState 在同一個測試檔內跨測試共用，所以每一則都從乾淨的狀態開始。
  useState('user-session', () => null).value = null
  useState('user-session-restored', () => false).value = false
  useState('user-session-pending', () => false).value = false
  useState<string | null>('user-session-error', () => null).value = null
  useState<CredentialsFieldErrorsDto | null>('user-session-field-errors', () => null).value = null
  useState<string | null>('user-session-redirect-to', () => null).value = null
})

describe('useUserSession：確認「現在是誰在用」只做一次', () => {
  it('第一次問就去確認，答案留下來', async () => {
    userSessionApplication.restoreSession.mockResolvedValue(SIGNED_IN_USER)
    const { currentUser, ensureSessionRestored } = sessionUnderTest()

    await ensureSessionRestored()

    expect(currentUser.value?.email).toBe('james@example.com')
  })

  it('第二次問就不再打後端——三個地方各問一次會得到三個可能不一樣的答案', async () => {
    const { ensureSessionRestored } = sessionUnderTest()

    await ensureSessionRestored()
    await ensureSessionRestored()

    expect(userSessionApplication.restoreSession).toHaveBeenCalledTimes(1)
  })

  it('連不上後端時當作沒登入，並且說得出為什麼——不是白畫面', async () => {
    // 它不能拋：把關要靠它決定放不放行，而一個會拋的把關等於換頁到一半整個停住。
    userSessionApplication.restoreSession.mockRejectedValue(
      new BackendUnreachableError('http://localhost:8080'))
    const { currentUser, errorMessage, ensureSessionRestored } = sessionUnderTest()

    await ensureSessionRestored()

    expect(currentUser.value).toBeNull()
    expect(errorMessage.value).toContain('連不上後端')
  })
})

describe('useUserSession：送出那兩格', () => {
  it('登入成功就記住是誰', async () => {
    userSessionApplication.signIn.mockResolvedValue(SIGNED_IN_USER)
    const { currentUser, submitCredentials } = sessionUnderTest()

    await submitCredentials('james@example.com', 'correct horse', 'signIn')

    expect(currentUser.value?.email).toBe('james@example.com')
  })

  it('建立帳號走的是另一條路', async () => {
    userSessionApplication.registerUser.mockResolvedValue(SIGNED_IN_USER)
    const { submitCredentials } = sessionUnderTest()

    await submitCredentials('james@example.com', 'correct horse', 'register')

    expect(userSessionApplication.registerUser).toHaveBeenCalledTimes(1)
    expect(userSessionApplication.signIn).not.toHaveBeenCalled()
  })

  it.each([
    {
      name: '帳密對不上就原文轉達後端那一句',
      failure: new CredentialsRejectedError('電子郵件或密碼不正確'),
      expected: '電子郵件或密碼不正確',
    },
    {
      name: '後端簽不出憑證時說清楚這不是使用者的錯',
      failure: new AccessTokenUnavailableError('尚未設定憑證簽章鑰匙'),
      expected: '不是你填錯了什麼',
    },
  ])('$name', async ({ failure, expected }) => {
    userSessionApplication.signIn.mockRejectedValue(failure)
    const { errorMessage, submitCredentials } = sessionUnderTest()

    await submitCredentials('james@example.com', 'wrong horse', 'signIn')

    expect(errorMessage.value).toContain(expected)
    expect(navigateToSpy).not.toHaveBeenCalled()
  })

  it('沒見過的失敗也要說一句人看得懂的話，而不是把原始訊息丟出去', async () => {
    userSessionApplication.signIn.mockRejectedValue(new Error('TypeError: undefined is not a function'))
    const { errorMessage, submitCredentials } = sessionUnderTest()

    await submitCredentials('james@example.com', 'correct horse', 'signIn')

    expect(errorMessage.value).toBe('登入時發生未預期的錯誤。')
  })

  it('被畫面自己擋下來時，原因掛在該格上而不是掛成一句話', async () => {
    userSessionApplication.signIn.mockRejectedValue(
      new CredentialsFieldError(new CredentialsFieldErrorsDto(null, '請填入密碼')))
    const { errorMessage, fieldErrors, submitCredentials } = sessionUnderTest()

    await submitCredentials('james@example.com', '', 'signIn')

    expect(fieldErrors.value?.password).toBe('請填入密碼')
    expect(errorMessage.value).toBeNull()
  })

  it('還在送的時候不會送第二次', async () => {
    const { pending, submitCredentials } = sessionUnderTest()
    pending.value = true

    await submitCredentials('james@example.com', 'correct horse', 'signIn')

    expect(userSessionApplication.signIn).not.toHaveBeenCalled()
  })

  it('切換模式時上一次的訊息被清掉——它講的是上一件事', async () => {
    userSessionApplication.signIn.mockRejectedValue(new CredentialsRejectedError('電子郵件或密碼不正確'))
    const { errorMessage, submitCredentials, clearSubmissionFeedback } = sessionUnderTest()
    await submitCredentials('james@example.com', 'wrong horse', 'signIn')

    clearSubmissionFeedback()

    expect(errorMessage.value).toBeNull()
  })
})

describe('useUserSession：登入之後回到他本來要去的地方', () => {
  it('回到他被擋下來時想去的那一頁，而不是門廳', async () => {
    userSessionApplication.signIn.mockResolvedValue(SIGNED_IN_USER)
    const { rememberRedirectTo, submitCredentials } = sessionUnderTest()
    rememberRedirectTo('/k-candles')

    await submitCredentials('james@example.com', 'correct horse', 'signIn')

    expect(navigateToSpy).toHaveBeenCalledWith('/k-candles')
  })

  it('沒有被擋下來過就去首頁', async () => {
    userSessionApplication.signIn.mockResolvedValue(SIGNED_IN_USER)
    const { submitCredentials } = sessionUnderTest()

    await submitCredentials('james@example.com', 'correct horse', 'signIn')

    expect(navigateToSpy).toHaveBeenCalledWith('/')
  })

  it('用過就忘記——下一次登入不該被上一次的目的地牽著走', async () => {
    userSessionApplication.signIn.mockResolvedValue(SIGNED_IN_USER)
    const { rememberRedirectTo, submitCredentials } = sessionUnderTest()
    rememberRedirectTo('/k-candles')
    await submitCredentials('james@example.com', 'correct horse', 'signIn')
    navigateToSpy.mockClear()

    await submitCredentials('james@example.com', 'correct horse', 'signIn')

    expect(navigateToSpy).toHaveBeenCalledWith('/')
  })
})

describe('useUserSession：登出', () => {
  it('丟掉憑證、清乾淨共用狀態，然後回到登入畫面', async () => {
    userSessionApplication.signIn.mockResolvedValue(SIGNED_IN_USER)
    const { currentUser, submitCredentials, rememberRedirectTo, signOut } = sessionUnderTest()
    await submitCredentials('james@example.com', 'correct horse', 'signIn')
    rememberRedirectTo('/k-candles')

    await signOut()

    expect(userSessionApplication.signOut).toHaveBeenCalledTimes(1)
    // 留著上一個人的電子郵件，側欄就會繼續顯示他。
    expect(currentUser.value).toBeNull()
    expect(navigateToSpy).toHaveBeenLastCalledWith('/login')

    // 上一個人被擋下來時想去的地方也得忘掉，否則下一個人一登入就被送去那裡。
    navigateToSpy.mockClear()
    await submitCredentials('james@example.com', 'correct horse', 'signIn')
    expect(navigateToSpy).toHaveBeenCalledWith('/')
  })
})
