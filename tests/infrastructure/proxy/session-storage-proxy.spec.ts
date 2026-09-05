import { afterEach, describe, expect, it, vi } from 'vitest'
import { SessionStorageProxy } from '~/infrastructure/proxy/session-storage-proxy'
import { Session } from '~/domain/models/entities/session'

const STORAGE_KEY = 'go-trading:access-token'
const ACCESS_TOKEN_EXPIRES_AT = new Date('2026-09-05T08:15:00.000Z')
const REFRESH_TOKEN_EXPIRES_AT = new Date('2026-10-05T08:00:00.000Z')

function aSession(): Session {
  return new Session(
    'an-access-token', ACCESS_TOKEN_EXPIRES_AT, 'a-refresh-token', REFRESH_TOKEN_EXPIRES_AT)
}

/** 記在儲存裡完整的那一份，供各測試挖掉其中一塊。 */
function storedSession(): Record<string, string> {
  return {
    accessToken: 'an-access-token',
    expiresAt: ACCESS_TOKEN_EXPIRES_AT.toISOString(),
    refreshToken: 'a-refresh-token',
    refreshTokenExpiresAt: REFRESH_TOKEN_EXPIRES_AT.toISOString(),
  }
}

/** 挖掉其中一塊之後記著的樣子——半份登入階段。 */
function storedWithout(field: string): string {
  return JSON.stringify(
    Object.fromEntries(Object.entries(storedSession()).filter(([key]) => key !== field)))
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('SessionStorageProxy：這台瀏覽器記著的那一段', () => {
  it('寫進去的四個值都讀得回來', () => {
    const proxy = new SessionStorageProxy()

    proxy.writeSession(aSession())

    const readBack = proxy.readSession()
    expect(readBack?.accessToken).toBe('an-access-token')
    expect(readBack?.accessTokenExpiresAt.getTime()).toBe(ACCESS_TOKEN_EXPIRES_AT.getTime())
    expect(readBack?.refreshToken).toBe('a-refresh-token')
    expect(readBack?.refreshTokenExpiresAt.getTime()).toBe(REFRESH_TOKEN_EXPIRES_AT.getTime())
  })

  it('什麼都沒寫過就是沒有', () => {
    expect(new SessionStorageProxy().readSession()).toBeNull()
  })

  it('清掉之後就沒有了', () => {
    const proxy = new SessionStorageProxy()
    proxy.writeSession(aSession())

    proxy.clearSession()

    expect(proxy.readSession()).toBeNull()
  })

  it.each([
    { name: '根本不是 JSON', stored: 'not-json' },
    { name: '少了登入憑證', stored: storedWithout('accessToken') },
    { name: '少了續用憑證', stored: storedWithout('refreshToken') },
    { name: '少了登入憑證的到期時刻', stored: storedWithout('expiresAt') },
    { name: '少了續用憑證的到期時刻', stored: storedWithout('refreshTokenExpiresAt') },
    {
      name: '上一版只記了一份憑證的舊格式',
      stored: JSON.stringify({ accessToken: 'an-access-token', expiresAt: '2026-09-05T08:15:00.000Z' }),
    },
    { name: '到期時刻讀不出來', stored: JSON.stringify({ ...storedSession(), expiresAt: 'not-a-date' }) },
    { name: '憑證是空字串', stored: JSON.stringify({ ...storedSession(), refreshToken: '' }) },
    { name: '型別整個不對', stored: JSON.stringify({ accessToken: 7, expiresAt: 9 }) },
  ])('記著的東西壞掉時當成沒有：$name', ({ stored }) => {
    // 半份登入階段比沒有登入階段更難處理，而它們能做的事一樣多。
    // 上一版的舊格式走的也是這條路，所以升級對使用者就只是被登出一次。
    localStorage.setItem(STORAGE_KEY, stored)

    expect(new SessionStorageProxy().readSession()).toBeNull()
  })

  it('瀏覽器把儲存整個關掉時，三個動作都不拋', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('storage is disabled')
      },
      setItem: () => {
        throw new Error('storage is disabled')
      },
      removeItem: () => {
        throw new Error('storage is disabled')
      },
    })

    const proxy = new SessionStorageProxy()

    expect(proxy.readSession()).toBeNull()
    expect(() => proxy.writeSession(aSession())).not.toThrow()
    expect(() => proxy.clearSession()).not.toThrow()
  })
})
