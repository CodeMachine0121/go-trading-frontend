import { describe, expect, it, vi } from 'vitest'
import type { IUserProxy } from '~/domain/interface/i-user-proxy'
import type { IAccessTokenStorageProxy } from '~/domain/interface/i-access-token-storage-proxy'
import { AccessToken } from '~/domain/models/entities/access-token'
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
const USABLE_TOKEN = new AccessToken('a-signed-token', new Date('2026-09-06T08:00:00.000Z'))
const EXPIRED_TOKEN = new AccessToken('a-stale-token', new Date('2026-09-05T07:59:59.000Z'))

type Fixture = {
  application: UserSessionApplication
  userProxy: Record<keyof IUserProxy, ReturnType<typeof vi.fn>>
  accessTokenStorageProxy: Record<keyof IAccessTokenStorageProxy, ReturnType<typeof vi.fn>>
}

/**
 * 測試力度放大：注入真實的 domain service（連帶真實 domain model），
 * 只 mock 最外層的兩個 proxy 介面。
 */
function buildFixture(overrides: {
  registerUser?: ReturnType<typeof vi.fn>
  signIn?: ReturnType<typeof vi.fn>
  fetchSignedInUser?: ReturnType<typeof vi.fn>
  readAccessToken?: ReturnType<typeof vi.fn>
  writeAccessToken?: ReturnType<typeof vi.fn>
  clearAccessToken?: ReturnType<typeof vi.fn>
} = {}): Fixture {
  const userProxy = {
    registerUser: overrides.registerUser ?? vi.fn().mockResolvedValue(SIGNED_IN_USER),
    signIn: overrides.signIn ?? vi.fn().mockResolvedValue(USABLE_TOKEN),
    fetchSignedInUser: overrides.fetchSignedInUser ?? vi.fn().mockResolvedValue(SIGNED_IN_USER),
  }
  const accessTokenStorageProxy = {
    readAccessToken: overrides.readAccessToken ?? vi.fn().mockReturnValue(null),
    writeAccessToken: overrides.writeAccessToken ?? vi.fn(),
    clearAccessToken: overrides.clearAccessToken ?? vi.fn(),
  }

  return {
    application: new UserSessionApplication(new UserSessionService(
      userProxy as unknown as IUserProxy,
      accessTokenStorageProxy as unknown as IAccessTokenStorageProxy,
    )),
    userProxy,
    accessTokenStorageProxy,
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
    expect(fixture.accessTokenStorageProxy.writeAccessToken).toHaveBeenCalledWith(USABLE_TOKEN)
    expect(signedInUser.email).toBe('james@example.com')
    expect(signedInUser.id).toBe(7)
  })

  it('帳密對不上就不記任何東西', async () => {
    const fixture = buildFixture({
      signIn: vi.fn().mockRejectedValue(new CredentialsRejectedError('電子郵件或密碼不正確')),
    })

    await expect(fixture.application.signIn(credentials()))
      .rejects.toBeInstanceOf(CredentialsRejectedError)
    expect(fixture.accessTokenStorageProxy.writeAccessToken).not.toHaveBeenCalled()
  })

  it('瀏覽器記不住憑證時登入仍然成功——這一次操作得起來，只是下次打開要重登', async () => {
    // 「記不住」在真實世界裡是記憶那一側安靜地什麼都沒做（它保證不拋，見
    // IAccessTokenStorageProxy），所以這裡的替身也什麼都不做。它不拋這件事本身
    // 由 AccessTokenStorageProxy 的測試守著。
    const fixture = buildFixture({ writeAccessToken: vi.fn() })

    const signedInUser = await fixture.application.signIn(credentials())

    expect(signedInUser.email).toBe('james@example.com')
  })

  it('後端簽不出憑證時原樣往上拋，不假裝是帳密的問題', async () => {
    const fixture = buildFixture({
      signIn: vi.fn().mockRejectedValue(new AccessTokenUnavailableError('尚未設定憑證簽章鑰匙')),
    })

    await expect(fixture.application.signIn(credentials()))
      .rejects.toBeInstanceOf(AccessTokenUnavailableError)
    expect(fixture.accessTokenStorageProxy.writeAccessToken).not.toHaveBeenCalled()
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
    expect(fixture.accessTokenStorageProxy.writeAccessToken).toHaveBeenCalledWith(USABLE_TOKEN)
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
    expect(fixture.accessTokenStorageProxy.writeAccessToken).not.toHaveBeenCalled()
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
    const fixture = buildFixture({ readAccessToken: vi.fn().mockReturnValue(EXPIRED_TOKEN) })

    await expect(fixture.application.restoreSession(NOW)).resolves.toBeNull()
    expect(fixture.userProxy.fetchSignedInUser).not.toHaveBeenCalled()
    expect(fixture.accessTokenStorageProxy.clearAccessToken).toHaveBeenCalled()
  })

  it('憑證還算數就拿它去問出目前登入者', async () => {
    const fixture = buildFixture({ readAccessToken: vi.fn().mockReturnValue(USABLE_TOKEN) })

    const signedInUser = await fixture.application.restoreSession(NOW)

    expect(fixture.userProxy.fetchSignedInUser).toHaveBeenCalledWith('a-signed-token')
    expect(signedInUser?.email).toBe('james@example.com')
  })

  it('後端不認得這份憑證就把它丟掉——留著只會讓下次載入再白跑一趟', async () => {
    const fixture = buildFixture({
      readAccessToken: vi.fn().mockReturnValue(USABLE_TOKEN),
      fetchSignedInUser: vi.fn().mockRejectedValue(new AuthenticationRequiredError('請重新登入')),
    })

    await expect(fixture.application.restoreSession(NOW)).resolves.toBeNull()
    expect(fixture.accessTokenStorageProxy.clearAccessToken).toHaveBeenCalled()
  })

  it('連不上後端時不丟掉憑證——後端沒開不代表這份憑證壞了', async () => {
    const fixture = buildFixture({
      readAccessToken: vi.fn().mockReturnValue(USABLE_TOKEN),
      fetchSignedInUser: vi.fn().mockRejectedValue(new BackendUnreachableError('http://localhost:8080')),
    })

    await expect(fixture.application.restoreSession(NOW))
      .rejects.toBeInstanceOf(BackendUnreachableError)
    expect(fixture.accessTokenStorageProxy.clearAccessToken).not.toHaveBeenCalled()
  })
})

describe('UserSessionApplication.signOut', () => {
  it('丟掉憑證，而且完全不碰後端', () => {
    const fixture = buildFixture()

    fixture.application.signOut()

    expect(fixture.accessTokenStorageProxy.clearAccessToken).toHaveBeenCalledTimes(1)
    expect(fixture.userProxy.signIn).not.toHaveBeenCalled()
    expect(fixture.userProxy.fetchSignedInUser).not.toHaveBeenCalled()
  })
})
