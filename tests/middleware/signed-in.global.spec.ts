// @vitest-environment nuxt
import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { SignedInUserDto } from '~/domain/models/dto/signed-in-user-dto'
import signedInMiddleware from '~/middleware/signed-in.global'

// mockNuxtImport 的工廠會被提升到檔案最上面，所以它要用到的東西也得跟著提升——
// 否則工廠跑的時候，這些變數還沒被建立。
const { session, navigateToSpy } = vi.hoisted(() => ({
  session: {
    currentUser: { value: null as SignedInUserDto | null },
    ensureSessionRestored: vi.fn().mockResolvedValue(undefined),
    rememberRedirectTo: vi.fn(),
  },
  navigateToSpy: vi.fn((path: string) => path),
}))

mockNuxtImport('useUserSession', () => () => session)
mockNuxtImport('navigateTo', () => navigateToSpy)

function routeTo(path: string) {
  return { path, fullPath: path } as never
}

async function walkTo(path: string, signedInUser: SignedInUserDto | null) {
  session.currentUser.value = signedInUser
  navigateToSpy.mockClear()
  session.rememberRedirectTo.mockClear()

  // 中介層的第三個參數在 Nuxt 裡是「從哪裡來」，這裡走到哪一頁與從哪裡來無關。
  return (signedInMiddleware as unknown as (
    to: never, from: never) => Promise<unknown>)(routeTo(path), routeTo('/'))
}

const SIGNED_IN_USER = { id: 7, email: 'james@example.com' } as SignedInUserDto

describe('把關：沒登入就只看得到登入畫面', () => {
  it('沒登入時走到操作台會被帶到登入畫面', async () => {
    await walkTo('/k-candles', null)

    expect(navigateToSpy).toHaveBeenCalledWith('/login')
  })

  it('並且記下他本來要去哪，好在登入之後把他放回那裡', async () => {
    await walkTo('/k-candles', null)

    expect(session.rememberRedirectTo).toHaveBeenCalledWith('/k-candles')
  })

  it('已登入時走得到操作台', async () => {
    await walkTo('/k-candles', SIGNED_IN_USER)

    expect(navigateToSpy).not.toHaveBeenCalled()
  })

  it('已經進門的人走到登入畫面會被帶回首頁——不必再看一次門', async () => {
    await walkTo('/login', SIGNED_IN_USER)

    expect(navigateToSpy).toHaveBeenCalledWith('/')
  })

  it('沒登入的人走到登入畫面就讓他待在那裡', async () => {
    await walkTo('/login', null)

    expect(navigateToSpy).not.toHaveBeenCalled()
  })

  it('每一次換頁都先確認一次「現在是誰在用」', async () => {
    // 確認本身只做一次，那是 useUserSession 的事；這裡守的是「每一次都問過它」——
    // 少問一次，就是一次沒有被把關的換頁。
    session.ensureSessionRestored.mockClear()

    await walkTo('/k-candles', SIGNED_IN_USER)

    expect(session.ensureSessionRestored).toHaveBeenCalledTimes(1)
  })
})
