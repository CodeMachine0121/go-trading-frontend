import { afterEach, describe, expect, it, vi } from 'vitest'
import { AccessTokenStorageProxy } from '~/infrastructure/proxy/access-token-storage-proxy'
import { AccessToken } from '~/domain/models/entities/access-token'

const STORAGE_KEY = 'go-trading:access-token'
const EXPIRES_AT = new Date('2026-09-06T08:00:00.000Z')

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('AccessTokenStorageProxy：這台瀏覽器記著的那份憑證', () => {
  it('寫進去的讀得回來，憑證與到期時刻都一樣', () => {
    const proxy = new AccessTokenStorageProxy()

    proxy.writeAccessToken(new AccessToken('a-signed-token', EXPIRES_AT))

    const readBack = proxy.readAccessToken()
    expect(readBack?.accessToken).toBe('a-signed-token')
    expect(readBack?.expiresAt.getTime()).toBe(EXPIRES_AT.getTime())
  })

  it('什麼都沒寫過就是沒有', () => {
    expect(new AccessTokenStorageProxy().readAccessToken()).toBeNull()
  })

  it('清掉之後就沒有了', () => {
    const proxy = new AccessTokenStorageProxy()
    proxy.writeAccessToken(new AccessToken('a-signed-token', EXPIRES_AT))

    proxy.clearAccessToken()

    expect(proxy.readAccessToken()).toBeNull()
  })

  it.each([
    { name: '根本不是 JSON', stored: 'not-json' },
    { name: '少了憑證那一半', stored: JSON.stringify({ expiresAt: EXPIRES_AT.toISOString() }) },
    { name: '憑證是空的', stored: JSON.stringify({ accessToken: '', expiresAt: EXPIRES_AT.toISOString() }) },
    { name: '少了到期時刻', stored: JSON.stringify({ accessToken: 'a-signed-token' }) },
    { name: '到期時刻讀不出來', stored: JSON.stringify({ accessToken: 'a-signed-token', expiresAt: 'not-a-date' }) },
    { name: '型別整個不對', stored: JSON.stringify({ accessToken: 7, expiresAt: 9 }) },
  ])('記著的東西壞掉時當成沒有：$name', ({ stored }) => {
    // 半份憑證比沒有憑證更難處理，而它們能做的事一樣多。
    localStorage.setItem(STORAGE_KEY, stored)

    expect(new AccessTokenStorageProxy().readAccessToken()).toBeNull()
  })

  it('瀏覽器把儲存整個關掉時，三個動作都不拋', () => {
    // 無痕視窗、封鎖網站資料——存取本身就會拋。讀不到等同還沒登入過；
    // 記不住只代表下次打開要重登，而這一次仍然操作得起來；
    // 清不掉更不能讓登出這個動作失敗。
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

    const proxy = new AccessTokenStorageProxy()

    expect(proxy.readAccessToken()).toBeNull()
    expect(() => proxy.writeAccessToken(new AccessToken('a-signed-token', EXPIRES_AT))).not.toThrow()
    expect(() => proxy.clearAccessToken()).not.toThrow()
  })
})
