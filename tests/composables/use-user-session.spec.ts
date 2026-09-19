// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { CredentialsFieldError } from '~/domain/errors/credentials-field-error'
import { CredentialsRejectedError } from '~/domain/errors/credentials-rejected-error'
import { SignInLockedError } from '~/domain/errors/sign-in-locked-error'
import { AccessTokenUnavailableError } from '~/domain/errors/access-token-unavailable-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { CredentialsFieldErrorsDto } from '~/domain/models/dto/credentials-field-errors-dto'
import { SignedInUserDto } from '~/domain/models/dto/signed-in-user-dto'
import { AccountActivationInstructionDto } from '~/domain/models/dto/account-activation-instruction-dto'

// 工廠會被提升，所以它要用到的東西也得跟著提升。
const { navigateToSpy } = vi.hoisted(() => ({
  // 回傳型別放寬成「字串或一個還沒完成的換頁」，因為有一則測試要把換頁停在半路上，
  // 才看得出那顆鍵是在換頁完成之前還是之後被放開的。
  navigateToSpy: vi.fn<(path: string) => string | Promise<void>>(path => path),
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

const SIGNED_IN_USER = new SignedInUserDto(7, 'james@example.com', true, null)

beforeEach(() => {
  vi.clearAllMocks()
  // clearAllMocks 只清呼叫紀錄，不清實作——沒有這一行，某一則測試裝上去的替身
  // 會活到後面每一則裡面。
  navigateToSpy.mockImplementation((path: string) => path)
  userSessionApplication.restoreSession.mockResolvedValue(null)
  // useState 在同一個測試檔內跨測試共用，所以每一則都從乾淨的狀態開始。
  useState('user-session', () => null).value = null
  useState<Promise<void> | null>('user-session-restoration', () => null).value = null
  useState<Promise<boolean> | null>('user-session-recovery', () => null).value = null
  useState('user-session-signing-out', () => false).value = false
  useState('user-session-pending', () => false).value = false
  useState<string | null>('user-session-error', () => null).value = null
  useState<CredentialsFieldErrorsDto | null>('user-session-field-errors', () => null).value = null
  useState<string | null>('user-session-redirect-to', () => null).value = null
  useState<string | null>('user-session-sign-in-notice', () => null).value = null
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

  it('問不出答案時不留下「已經問過」——後端稍後啟動就該再問一次', async () => {
    // 留著的話，一個只是「後端還沒啟動」的暫時狀況會變成這個分頁的永久狀態：
    // 後端起來了，使用者按遍每一頁也回不去，只能整個重新載入。
    userSessionApplication.restoreSession.mockRejectedValueOnce(
      new BackendUnreachableError('http://localhost:8080'))
    userSessionApplication.restoreSession.mockResolvedValueOnce(SIGNED_IN_USER)
    const { currentUser, ensureSessionRestored } = sessionUnderTest()

    await ensureSessionRestored()
    expect(currentUser.value).toBeNull()

    await ensureSessionRestored()

    expect(currentUser.value?.email).toBe('james@example.com')
  })

  it('答案還沒回來時問的人會排在同一個答案後面，不會拿到一個很肯定的「沒登入」', async () => {
    // 拿到的話，那個人會被帶到登入畫面——而真正的答案回來時已經沒有人在等它了。
    let resolveRestore: (value: SignedInUserDto) => void = () => {}
    userSessionApplication.restoreSession.mockReturnValue(
      new Promise<SignedInUserDto>((resolve) => {
        resolveRestore = resolve
      }))
    const { currentUser, ensureSessionRestored } = sessionUnderTest()

    const first = ensureSessionRestored()
    const second = ensureSessionRestored()
    expect(userSessionApplication.restoreSession).toHaveBeenCalledTimes(1)

    // 讓答案晚一個 macrotask 才回來。晚到的那一個若沒有真的在等，它會在這之前就結束，
    // 而那時候答案還不在——這正是要守住的差別。
    setTimeout(() => resolveRestore(SIGNED_IN_USER), 0)
    await second

    // 晚到的那一個**結束的時候答案必須已經在了**。它若提早結束，把關就會拿著一個
    // 「沒登入」把人帶到登入畫面，而真正的答案回來時已經沒有人在等它了。
    expect(currentUser.value?.email).toBe('james@example.com')
    await first
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
  it('換頁完成之前不放開那顆鍵', async () => {
    // 放開的話，換頁還在進行的那段時間畫面仍然是登入卡片，而那顆鍵已經能按了——
    // 按一下 Enter 就會再送一次，開出第二段登入階段，而第一段沒有人撤得掉。
    userSessionApplication.signIn.mockResolvedValue(SIGNED_IN_USER)
    const { pending, submitCredentials } = sessionUnderTest()
    let completeNavigation: () => void = () => {}
    navigateToSpy.mockImplementationOnce(() => new Promise<void>((resolve) => {
      completeNavigation = () => resolve()
    }))

    const submission = submitCredentials('james@example.com', 'correct horse', 'signIn')
    // 讓已經排隊的每一個 microtask 跑完，但換頁本身刻意還沒結束。
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(navigateToSpy).toHaveBeenCalled()
    expect(pending.value).toBe(true)

    completeNavigation()
    await submission

    expect(pending.value).toBe(false)
  })

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

  it('被鎖住時說的是另一句話，而且寫出使用者自己時區的那個時刻', async () => {
    // 後端給的是世界標準時間。照抄的話，一個在台北的人會讀到一個早他八小時的
    // 時間，然後以為已經可以進去了。
    userSessionApplication.signIn.mockRejectedValue(
      new SignInLockedError('已被鎖住', new Date('2026-09-12T08:00:00Z')))
    const { errorMessage, submitCredentials } = sessionUnderTest()

    await submitCredentials('james@example.com', 'correct horse', 'signIn')

    // The hour is worked out with getHours() rather than with the formatter the
    // implementation uses. Recomputing the expected string the same way the code
    // builds it asserts only that the code equals itself, and would stay green if
    // both were changed to print UTC together.
    //
    // Whether the clock reads twelve or twenty-four hours is the viewer's locale,
    // which this deliberately does not pin — so either rendering of that hour
    // counts, and the point being made is the hour itself.
    //
    // The minutes are worked out too rather than assumed to be the UTC ones: half
    // an hour of the world sits on a thirty- or forty-five-minute offset, and a
    // test that hard-codes :00 fails in Adelaide for a reason that has nothing to
    // do with what it is checking.
    const shutUntil = new Date('2026-09-12T08:00:00Z')
    const localHour = shutUntil.getHours()
    const twelveHourClock = localHour % 12 === 0 ? 12 : localHour % 12
    const localMinutes = String(shutUntil.getMinutes()).padStart(2, '0')
    expect(errorMessage.value).toContain('被鎖住')
    expect(errorMessage.value).toMatch(
      new RegExp(`\\b(${localHour}|${twelveHourClock}):${localMinutes}\\b`))
    expect(errorMessage.value).not.toContain('08:00:00')
    expect(errorMessage.value).not.toContain('電子郵件或密碼不正確')
  })

  it('那句話同時寫得出日期與時間——只有時間的話，一週的鎖會被讀成再等幾分鐘', async () => {
    userSessionApplication.signIn.mockRejectedValue(
      new SignInLockedError('已被鎖住', new Date('2026-09-12T08:00:00Z')))
    const { errorMessage, submitCredentials } = sessionUnderTest()

    await submitCredentials('james@example.com', 'correct horse', 'signIn')

    expect(errorMessage.value).toContain('2026')
    expect(errorMessage.value).toMatch(/\d{1,2}:\d{2}/)
  })

  it('說不出時刻時仍然說他被鎖住，絕不退回去說帳密不正確', async () => {
    // 退回去的那一句會讓他繼續試密碼，而那正是這道鎖要終結的行為。
    userSessionApplication.signIn.mockRejectedValue(new SignInLockedError('已被鎖住', null))
    const { errorMessage, submitCredentials } = sessionUnderTest()

    await submitCredentials('james@example.com', 'correct horse', 'signIn')

    expect(errorMessage.value).toContain('被鎖住')
    expect(errorMessage.value).not.toContain('電子郵件或密碼不正確')
    expect(errorMessage.value).not.toBe('登入時發生未預期的錯誤。')
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
  it('連按兩下只送一次——同一份續用憑證被撤兩次會被後端讀成盜用', async () => {
    userSessionApplication.signIn.mockResolvedValue(SIGNED_IN_USER)
    const { submitCredentials, signOut } = sessionUnderTest()
    await submitCredentials('james@example.com', 'correct horse', 'signIn')
    let releaseSignOut: () => void = () => {}
    userSessionApplication.signOut.mockReturnValue(
      new Promise<void>((resolve) => {
        releaseSignOut = resolve
      }))

    const first = signOut()
    const second = signOut()
    releaseSignOut()
    await Promise.all([first, second])

    expect(userSessionApplication.signOut).toHaveBeenCalledTimes(1)
  })

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

describe('useUserSession：這一次登入在操作到一半時不算數了', () => {
  it('清掉共用的那一份，並把人帶回登入畫面', async () => {
    // 不清的話，側欄會繼續顯示一個已經不算數的人，而把關那一道門也會繼續放行。
    // 這個測試環境的路由器一開始就停在登入畫面上，而那正是這條規則會跳過的情形——
    // 所以先真的走到別的地方去（navigateTo 是替身，動不了路由器）。
    const session = sessionUnderTest()
    await useRouter().replace('/k-candles')
    useState<SignedInUserDto | null>('user-session', () => null).value = SIGNED_IN_USER

    await session.signOutBecauseSessionExpired()

    expect(session.currentUser.value).toBeNull()
    expect(navigateToSpy).toHaveBeenCalledWith('/login')
  })

  it('不跑那一趟撤銷——後端已經說了「請重新登入」，那趟必然再被擋一次', async () => {
    // 它與使用者按下的登出不是同一件事，所以不共用那一條路。
    const session = sessionUnderTest()
    await useRouter().replace('/k-candles')
    useState<SignedInUserDto | null>('user-session', () => null).value = SIGNED_IN_USER

    await session.signOutBecauseSessionExpired()

    expect(userSessionApplication.signOut).not.toHaveBeenCalled()
  })

  it('已經在登入畫面上時什麼都不做，不多跳一次', async () => {
    const session = sessionUnderTest()
    await useRouter().replace('/login')
    navigateToSpy.mockClear()

    await session.signOutBecauseSessionExpired()

    expect(navigateToSpy).not.toHaveBeenCalled()
  })
})

describe('useUserSession：把過期的那一段救回來', () => {
  it('換到新的一對就回 true，讓被擋下來的那一發重送', async () => {
    // 登入憑證只活十五分鐘，續用憑證活三十天——這就是十六分鐘之後按下計算時發生的事。
    userSessionApplication.restoreSession.mockResolvedValue(SIGNED_IN_USER)
    const { recoverExpiredSession, currentUser } = sessionUnderTest()

    const recovered = await recoverExpiredSession()

    expect(recovered).toBe(true)
    expect(currentUser.value?.email).toBe('james@example.com')
  })

  it('換不到就回 false——那才是真的得重新登入了', async () => {
    userSessionApplication.restoreSession.mockResolvedValue(null)
    const { recoverExpiredSession, currentUser } = sessionUnderTest()

    const recovered = await recoverExpiredSession()

    expect(recovered).toBe(false)
    expect(currentUser.value).toBeNull()
  })

  it('同時被擋下來的幾發只換一次——續用憑證用過就失效', async () => {
    // 各換一次的話，第二次會被後端判定為盜用，把「這一台要重登」升級成
    // 「這個人每一台都被登出」。
    userSessionApplication.restoreSession.mockResolvedValue(SIGNED_IN_USER)
    const { recoverExpiredSession } = sessionUnderTest()

    const [first, second, third] = await Promise.all([
      recoverExpiredSession(), recoverExpiredSession(), recoverExpiredSession(),
    ])

    expect(userSessionApplication.restoreSession).toHaveBeenCalledTimes(1)
    expect([first, second, third]).toEqual([true, true, true])
  })

  it('下一次過期會再救一次——上一次的答案是那一段還有效時算出來的', async () => {
    // 這正是它與「這個分頁確認過了」那一份分開的理由：那一份要記得，這一份不能記。
    userSessionApplication.restoreSession.mockResolvedValue(SIGNED_IN_USER)
    const { recoverExpiredSession } = sessionUnderTest()

    await recoverExpiredSession()
    await recoverExpiredSession()

    expect(userSessionApplication.restoreSession).toHaveBeenCalledTimes(2)
  })

  it('連不上後端時回 false，而且不當成一次成功的救援', async () => {
    userSessionApplication.restoreSession.mockRejectedValue(new BackendUnreachableError('http://localhost:8080'))
    const { recoverExpiredSession, currentUser } = sessionUnderTest()

    const recovered = await recoverExpiredSession()

    expect(recovered).toBe(false)
    expect(currentUser.value).toBeNull()
  })
})

describe('useUserSession：帶去登入畫面的那一句話', () => {
  it('說了之後由登入畫面取走，而且只說一次', () => {
    // 留著的話，下一次因為別的原因回到登入畫面時，它會再說一次一件早就過去的事。
    useState<string | null>('user-session-sign-in-notice').value = '密碼已更換，請用新密碼重新登入。'
    const { takeSignInNotice } = sessionUnderTest()

    expect(takeSignInNotice()).toBe('密碼已更換，請用新密碼重新登入。')
    expect(takeSignInNotice()).toBeNull()
  })

  it('沒有人留話時就沒有話', () => {
    expect(sessionUnderTest().takeSignInNotice()).toBeNull()
  })
})

describe('useUserSession：還沒被放行的那一段', () => {
  const AWAITING_USER = new SignedInUserDto(
    7, 'james@example.com', false,
    new AccountActivationInstructionDto('gatekeeper@example.com', '申請：james@example.com'))

  it('登入著但還沒開通時說得出來，並交得出那份指示', async () => {
    userSessionApplication.restoreSession.mockResolvedValue(AWAITING_USER)
    const { awaitingActivation, activationInstruction, ensureSessionRestored } = sessionUnderTest()

    await ensureSessionRestored()

    expect(awaitingActivation.value).toBe(true)
    expect(activationInstruction.value?.requestMailbox).toBe('gatekeeper@example.com')
  })

  it('被放行之後就不再說他在等，指示也跟著消失', async () => {
    userSessionApplication.restoreSession.mockResolvedValue(SIGNED_IN_USER)
    const { awaitingActivation, activationInstruction, ensureSessionRestored } = sessionUnderTest()

    await ensureSessionRestored()

    expect(awaitingActivation.value).toBe(false)
    expect(activationInstruction.value).toBeNull()
  })

  it('根本沒登入的人不算在等——他要做的是登入', async () => {
    const { awaitingActivation, ensureSessionRestored } = sessionUnderTest()

    await ensureSessionRestored()

    expect(awaitingActivation.value).toBe(false)
  })

  it('重新檢查是真的再問一次後端，不是回用上一次的答案', async () => {
    // 放行發生在這個系統之外，這一側永遠不會被通知。回用上一次的答案，
    // 那顆鍵就是一顆假的鍵——他會一直按，而畫面永遠不變。
    userSessionApplication.restoreSession.mockResolvedValue(AWAITING_USER)
    const { awaitingActivation, ensureSessionRestored, recheckActivation } = sessionUnderTest()
    await ensureSessionRestored()
    expect(userSessionApplication.restoreSession).toHaveBeenCalledTimes(1)

    userSessionApplication.restoreSession.mockResolvedValue(SIGNED_IN_USER)
    await recheckActivation()

    expect(userSessionApplication.restoreSession).toHaveBeenCalledTimes(2)
    expect(awaitingActivation.value).toBe(false)
  })

  it('發現自己被放行了就直接進操作台', async () => {
    // 把關只在**換頁的當下**跑。不在這裡換頁的話，他會停在一個已經不該看到的畫面上，
    // 而畫面上什麼都沒變——看起來就像那顆鍵壞了。
    userSessionApplication.restoreSession.mockResolvedValue(SIGNED_IN_USER)
    const { recheckActivation } = sessionUnderTest()

    await recheckActivation()

    expect(navigateToSpy).toHaveBeenCalledWith('/')
  })

  it('還沒被放行就不換頁——把他送去首頁，首頁只會再把他送回來', async () => {
    userSessionApplication.restoreSession.mockResolvedValue(AWAITING_USER)
    const { recheckActivation } = sessionUnderTest()

    await recheckActivation()

    expect(navigateToSpy).not.toHaveBeenCalled()
  })

  it('還沒被放行時，重新檢查之後留在原地，指示照舊', async () => {
    userSessionApplication.restoreSession.mockResolvedValue(AWAITING_USER)
    const { awaitingActivation, activationInstruction, recheckActivation } = sessionUnderTest()

    await recheckActivation()

    expect(awaitingActivation.value).toBe(true)
    expect(activationInstruction.value?.subject).toBe('申請：james@example.com')
  })

  it('檢查中不會被按第二次——每一下都是一趟後端', async () => {
    userSessionApplication.restoreSession.mockResolvedValue(AWAITING_USER)
    const { recheckActivation } = sessionUnderTest()

    await Promise.all([recheckActivation(), recheckActivation()])

    expect(userSessionApplication.restoreSession).toHaveBeenCalledTimes(1)
  })
})
