import { describe, expect, it, vi } from 'vitest'
import type { IUserProxy } from '~/domain/interface/i-user-proxy'
import type { ISessionStorageProxy } from '~/domain/interface/i-session-storage-proxy'
import { Session } from '~/domain/models/entities/session'
import { SignedInUser } from '~/domain/models/entities/signed-in-user'
import { CredentialsDto } from '~/domain/models/dto/credentials-dto'
import { CredentialsFieldError } from '~/domain/errors/credentials-field-error'
import { CredentialsRejectedError } from '~/domain/errors/credentials-rejected-error'
import { EmailAlreadyRegisteredError } from '~/domain/errors/email-already-registered-error'
import { AccessTokenUnavailableError } from '~/domain/errors/access-token-unavailable-error'
import { AuthenticationRequiredError } from '~/domain/errors/authentication-required-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { UserSessionService } from '~/domain/service/user-session-service'
import { UserSessionApplication } from '~/application/user-session-application'

const NOW = new Date('2026-09-05T08:00:00.000Z')
const SIGNED_IN_USER = new SignedInUser(7, 'james@example.com')

/** 兩份都還有效。 */
const USABLE_SESSION = new Session(
  'an-access-token', new Date('2026-09-05T08:15:00.000Z'),
  'a-refresh-token', new Date('2026-10-05T08:00:00.000Z'))

/** 登入憑證過期了，續用憑證還在——這正是該去換一份的時候。 */
const STALE_ACCESS_SESSION = new Session(
  'a-stale-access-token', new Date('2026-09-05T07:59:59.000Z'),
  'a-refresh-token', new Date('2026-10-05T08:00:00.000Z'))

/** 兩份都過期了，沒救了。 */
const EXPIRED_SESSION = new Session(
  'a-stale-access-token', new Date('2026-09-05T07:59:59.000Z'),
  'a-stale-refresh-token', new Date('2026-09-04T08:00:00.000Z'))

/** 換回來的那一對。 */
const RENEWED_SESSION = new Session(
  'a-newer-access-token', new Date('2026-09-05T08:15:00.000Z'),
  'a-newer-refresh-token', new Date('2026-10-05T08:00:00.000Z'))

type Fixture = {
  application: UserSessionApplication
  userProxy: Record<keyof IUserProxy, ReturnType<typeof vi.fn>>
  sessionStorageProxy: Record<keyof ISessionStorageProxy, ReturnType<typeof vi.fn>>
}

/**
 * 測試力度放大：注入真實的 domain service（連帶真實 domain model），
 * 只 mock 最外層的兩個 proxy 介面。
 */
function buildFixture(overrides: {
  registerUser?: ReturnType<typeof vi.fn>
  signIn?: ReturnType<typeof vi.fn>
  renewSession?: ReturnType<typeof vi.fn>
  revokeSession?: ReturnType<typeof vi.fn>
  fetchSignedInUser?: ReturnType<typeof vi.fn>
  readSession?: ReturnType<typeof vi.fn>
  writeSession?: ReturnType<typeof vi.fn>
  clearSession?: ReturnType<typeof vi.fn>
} = {}): Fixture {
  const userProxy = {
    registerUser: overrides.registerUser ?? vi.fn().mockResolvedValue(SIGNED_IN_USER),
    signIn: overrides.signIn ?? vi.fn().mockResolvedValue(USABLE_SESSION),
    renewSession: overrides.renewSession ?? vi.fn().mockResolvedValue(RENEWED_SESSION),
    revokeSession: overrides.revokeSession ?? vi.fn().mockResolvedValue(undefined),
    fetchSignedInUser: overrides.fetchSignedInUser ?? vi.fn().mockResolvedValue(SIGNED_IN_USER),
  }
  const sessionStorageProxy = {
    readSession: overrides.readSession ?? vi.fn().mockReturnValue(null),
    writeSession: overrides.writeSession ?? vi.fn(),
    clearSession: overrides.clearSession ?? vi.fn(),
  }

  return {
    application: new UserSessionApplication(new UserSessionService(
      userProxy as unknown as IUserProxy,
      sessionStorageProxy as unknown as ISessionStorageProxy,
    )),
    userProxy,
    sessionStorageProxy,
  }
}

function credentials(password = 'correct horse', mode: 'signIn' | 'register' = 'signIn') {
  return new CredentialsDto('  james@example.com  ', password, mode)
}

describe('UserSessionApplication.signIn', () => {
  it('送出去的電子郵件不帶前後空白，成功就把憑證記起來', async () => {
    const fixture = buildFixture()

    const signedInUser = await fixture.application.signIn(credentials())

    expect(fixture.userProxy.signIn).toHaveBeenCalledWith('james@example.com', 'correct horse')
    expect(fixture.sessionStorageProxy.writeSession).toHaveBeenCalledWith(USABLE_SESSION)
    expect(signedInUser.email).toBe('james@example.com')
    expect(signedInUser.id).toBe(7)
  })

  it('帳密對不上就不記任何東西', async () => {
    const fixture = buildFixture({
      signIn: vi.fn().mockRejectedValue(new CredentialsRejectedError('電子郵件或密碼不正確')),
    })

    await expect(fixture.application.signIn(credentials()))
      .rejects.toBeInstanceOf(CredentialsRejectedError)
    expect(fixture.sessionStorageProxy.writeSession).not.toHaveBeenCalled()
  })

  it('瀏覽器記不住憑證時登入仍然成功——這一次操作得起來，只是下次打開要重登', async () => {
    // 「記不住」在真實世界裡是記憶那一側安靜地什麼都沒做（它保證不拋，見
    // IAccessTokenStorageProxy），所以這裡的替身也什麼都不做。它不拋這件事本身
    // 由 AccessTokenStorageProxy 的測試守著。
    const fixture = buildFixture({ writeSession: vi.fn() })

    const signedInUser = await fixture.application.signIn(credentials())

    expect(signedInUser.email).toBe('james@example.com')
  })

  it('後端簽不出憑證時原樣往上拋，不假裝是帳密的問題', async () => {
    const fixture = buildFixture({
      signIn: vi.fn().mockRejectedValue(new AccessTokenUnavailableError('尚未設定憑證簽章鑰匙')),
    })

    await expect(fixture.application.signIn(credentials()))
      .rejects.toBeInstanceOf(AccessTokenUnavailableError)
    expect(fixture.sessionStorageProxy.writeSession).not.toHaveBeenCalled()
  })

  it('兩格沒填好就完全不打後端', async () => {
    const fixture = buildFixture()

    await expect(fixture.application.signIn(new CredentialsDto('', '', 'signIn')))
      .rejects.toBeInstanceOf(CredentialsFieldError)
    expect(fixture.userProxy.signIn).not.toHaveBeenCalled()
  })
})

describe('UserSessionApplication.registerUser', () => {
  it('建立成功之後直接就是登入狀態，不必再填一次同樣的兩格', async () => {
    const fixture = buildFixture()

    const signedInUser = await fixture.application.registerUser(credentials('correct horse', 'register'))

    expect(fixture.userProxy.registerUser).toHaveBeenCalledTimes(1)
    expect(fixture.userProxy.signIn).toHaveBeenCalledTimes(1)
    expect(fixture.sessionStorageProxy.writeSession).toHaveBeenCalledWith(USABLE_SESSION)
    expect(signedInUser.email).toBe('james@example.com')
  })

  it('電子郵件已經有人用了就停在那裡，不會接著去登入', async () => {
    const fixture = buildFixture({
      registerUser: vi.fn().mockRejectedValue(
        new EmailAlreadyRegisteredError('電子郵件「james@example.com」已經有人用了')),
    })

    await expect(fixture.application.registerUser(credentials('correct horse', 'register')))
      .rejects.toBeInstanceOf(EmailAlreadyRegisteredError)
    expect(fixture.userProxy.signIn).not.toHaveBeenCalled()
    expect(fixture.sessionStorageProxy.writeSession).not.toHaveBeenCalled()
  })

  it('密碼太短就完全不打後端', async () => {
    const fixture = buildFixture()

    await expect(fixture.application.registerUser(credentials('1234567', 'register')))
      .rejects.toBeInstanceOf(CredentialsFieldError)
    expect(fixture.userProxy.registerUser).not.toHaveBeenCalled()
  })

  it('擋下來的失敗帶著是哪一格的原因', async () => {
    const fixture = buildFixture()

    await fixture.application.registerUser(credentials('1234567', 'register')).catch((error: unknown) => {
      expect(error).toBeInstanceOf(CredentialsFieldError)
      expect((error as CredentialsFieldError).fieldErrors.password).toContain('8')
      expect((error as CredentialsFieldError).fieldErrors.email).toBeNull()
    })

    expect.hasAssertions()
  })
})

describe('UserSessionApplication.restoreSession', () => {
  it('沒有記住任何憑證就是沒登入，而且不打後端', async () => {
    const fixture = buildFixture()

    await expect(fixture.application.restoreSession(NOW)).resolves.toBeNull()
    expect(fixture.userProxy.fetchSignedInUser).not.toHaveBeenCalled()
  })

  it('自己就知道已經過期的憑證不會被拿去問後端', async () => {
    const fixture = buildFixture({ readSession: vi.fn().mockReturnValue(EXPIRED_SESSION) })

    await expect(fixture.application.restoreSession(NOW)).resolves.toBeNull()
    expect(fixture.userProxy.fetchSignedInUser).not.toHaveBeenCalled()
    expect(fixture.sessionStorageProxy.clearSession).toHaveBeenCalled()
  })

  it('憑證還算數就拿它去問出目前登入者', async () => {
    const fixture = buildFixture({ readSession: vi.fn().mockReturnValue(USABLE_SESSION) })

    const signedInUser = await fixture.application.restoreSession(NOW)

    expect(fixture.userProxy.fetchSignedInUser).toHaveBeenCalledWith('an-access-token')
    expect(signedInUser?.email).toBe('james@example.com')
  })

  it('憑證還算數時不會多做一次換發', async () => {
    const fixture = buildFixture({ readSession: vi.fn().mockReturnValue(USABLE_SESSION) })

    await fixture.application.restoreSession(NOW)

    expect(fixture.userProxy.renewSession).not.toHaveBeenCalled()
  })

  it('登入憑證過期就先換一對，使用者看不到任何異狀', async () => {
    const fixture = buildFixture({ readSession: vi.fn().mockReturnValue(STALE_ACCESS_SESSION) })

    const signedInUser = await fixture.application.restoreSession(NOW)

    expect(fixture.userProxy.renewSession).toHaveBeenCalledWith('a-refresh-token')
    expect(fixture.sessionStorageProxy.writeSession).toHaveBeenCalledWith(RENEWED_SESSION)
    expect(fixture.userProxy.fetchSignedInUser).toHaveBeenCalledWith('a-newer-access-token')
    expect(signedInUser?.email).toBe('james@example.com')
  })

  it('後端不認得這份登入憑證時，先試著換一次再問一次', async () => {
    // 後端重啟時換過鑰匙就會長這樣：憑證看起來還在有效期內，但後端認不得它。
    const fixture = buildFixture({
      readSession: vi.fn().mockReturnValue(USABLE_SESSION),
      fetchSignedInUser: vi.fn()
        .mockRejectedValueOnce(new AuthenticationRequiredError('請重新登入'))
        .mockResolvedValueOnce(SIGNED_IN_USER),
    })

    const signedInUser = await fixture.application.restoreSession(NOW)

    expect(fixture.userProxy.renewSession).toHaveBeenCalledTimes(1)
    expect(fixture.userProxy.fetchSignedInUser).toHaveBeenNthCalledWith(2, 'a-newer-access-token')
    expect(signedInUser?.email).toBe('james@example.com')
  })

  it('換了一份全新的還是被拒絕就放棄，而且不再換第三次', async () => {
    // 換到全新的憑證後端仍然不認，那就不是過期的問題了。再換只會得到同樣的答案，
    // 外加一次踩到後端盜用偵測的機會。
    const fixture = buildFixture({
      readSession: vi.fn().mockReturnValue(USABLE_SESSION),
      fetchSignedInUser: vi.fn().mockRejectedValue(new AuthenticationRequiredError('請重新登入')),
    })

    await expect(fixture.application.restoreSession(NOW)).resolves.toBeNull()
    expect(fixture.userProxy.renewSession).toHaveBeenCalledTimes(1)
    expect(fixture.sessionStorageProxy.clearSession).toHaveBeenCalled()
  })

  it('換發本身被拒絕就當作沒登入，而且不再問一次', async () => {
    const fixture = buildFixture({
      readSession: vi.fn().mockReturnValue(USABLE_SESSION),
      fetchSignedInUser: vi.fn().mockRejectedValue(new AuthenticationRequiredError('請重新登入')),
      renewSession: vi.fn().mockRejectedValue(new AuthenticationRequiredError('請重新登入')),
    })

    await expect(fixture.application.restoreSession(NOW)).resolves.toBeNull()
    expect(fixture.userProxy.fetchSignedInUser).toHaveBeenCalledTimes(1)
    expect(fixture.sessionStorageProxy.clearSession).toHaveBeenCalled()
  })

  it('登入憑證過期、換發又被拒絕就當作沒登入，而且問都不問', async () => {
    const fixture = buildFixture({
      readSession: vi.fn().mockReturnValue(STALE_ACCESS_SESSION),
      renewSession: vi.fn().mockRejectedValue(new AuthenticationRequiredError('請重新登入')),
    })

    await expect(fixture.application.restoreSession(NOW)).resolves.toBeNull()
    expect(fixture.userProxy.fetchSignedInUser).not.toHaveBeenCalled()
    expect(fixture.sessionStorageProxy.clearSession).toHaveBeenCalled()
  })

  it('換完之後再問時連不上後端，一樣不丟掉記著的東西', async () => {
    const fixture = buildFixture({
      readSession: vi.fn().mockReturnValue(USABLE_SESSION),
      fetchSignedInUser: vi.fn()
        .mockRejectedValueOnce(new AuthenticationRequiredError('請重新登入'))
        .mockRejectedValueOnce(new BackendUnreachableError('http://localhost:8080')),
    })

    await expect(fixture.application.restoreSession(NOW))
      .rejects.toBeInstanceOf(BackendUnreachableError)
    expect(fixture.sessionStorageProxy.clearSession).not.toHaveBeenCalled()
  })

  it('連不上後端時不丟掉記著的東西——後端沒開不代表這一段壞了', async () => {
    const fixture = buildFixture({
      readSession: vi.fn().mockReturnValue(USABLE_SESSION),
      fetchSignedInUser: vi.fn().mockRejectedValue(new BackendUnreachableError('http://localhost:8080')),
    })

    await expect(fixture.application.restoreSession(NOW))
      .rejects.toBeInstanceOf(BackendUnreachableError)
    expect(fixture.sessionStorageProxy.clearSession).not.toHaveBeenCalled()
    expect(fixture.userProxy.renewSession).not.toHaveBeenCalled()
  })

  it('換發時連不上後端同樣不丟掉記著的東西', async () => {
    const fixture = buildFixture({
      readSession: vi.fn().mockReturnValue(STALE_ACCESS_SESSION),
      renewSession: vi.fn().mockRejectedValue(new BackendUnreachableError('http://localhost:8080')),
    })

    await expect(fixture.application.restoreSession(NOW))
      .rejects.toBeInstanceOf(BackendUnreachableError)
    expect(fixture.sessionStorageProxy.clearSession).not.toHaveBeenCalled()
  })

  it('換發成功但記不住時，這一次仍然回得出目前登入者', async () => {
    const fixture = buildFixture({
      readSession: vi.fn().mockReturnValue(STALE_ACCESS_SESSION),
      writeSession: vi.fn(),
    })

    const signedInUser = await fixture.application.restoreSession(NOW)

    expect(signedInUser?.email).toBe('james@example.com')
  })
})

describe('UserSessionApplication.signOut', () => {
  it('請後端撤掉這台裝置的登入階段，然後清乾淨', async () => {
    const fixture = buildFixture({ readSession: vi.fn().mockReturnValue(USABLE_SESSION) })

    await fixture.application.signOut()

    expect(fixture.userProxy.revokeSession).toHaveBeenCalledWith('a-refresh-token')
    expect(fixture.sessionStorageProxy.clearSession).toHaveBeenCalledTimes(1)
  })

  it.each([
    { name: '後端連不上', failure: new BackendUnreachableError('http://localhost:8080') },
    { name: '後端說失敗', failure: new Error('boom') },
  ])('$name 時登出仍然成功，本機照樣清乾淨', async ({ failure }) => {
    // 登出在畫面上一定要成功。做不到的只是「立刻讓後端也忘記」，
    // 而使用者能做的只有稍後再登出一次——那不值得把他攔在一個他已經決定離開的畫面上。
    const fixture = buildFixture({
      readSession: vi.fn().mockReturnValue(USABLE_SESSION),
      revokeSession: vi.fn().mockRejectedValue(failure),
    })

    await expect(fixture.application.signOut()).resolves.toBeUndefined()
    expect(fixture.sessionStorageProxy.clearSession).toHaveBeenCalledTimes(1)
  })

  it('沒有東西可以撤時不打擾後端', async () => {
    const fixture = buildFixture()

    await fixture.application.signOut()

    expect(fixture.userProxy.revokeSession).not.toHaveBeenCalled()
    expect(fixture.sessionStorageProxy.clearSession).toHaveBeenCalledTimes(1)
  })
})
