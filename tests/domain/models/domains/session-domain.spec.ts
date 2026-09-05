import { describe, expect, it } from 'vitest'
import { Session } from '~/domain/models/entities/session'

const NOW = new Date('2026-09-05T08:00:00.000Z')

function sessionExpiringAt(accessTokenExpiresAt: string, refreshTokenExpiresAt: string): Session {
  return new Session(
    'an-access-token',
    new Date(accessTokenExpiresAt),
    'a-refresh-token',
    new Date(refreshTokenExpiresAt),
  )
}

describe('SessionDomain：兩份憑證各自還算不算數', () => {
  it.each([
    {
      name: '兩份都還有效',
      access: '2026-09-05T08:15:00.000Z',
      refresh: '2026-10-05T08:00:00.000Z',
      expectedAccessUsable: true,
      expectedRefreshUsable: true,
    },
    {
      name: '登入憑證過期了，續用憑證還在——這正是要去換一份的時候',
      access: '2026-09-05T07:59:59.000Z',
      refresh: '2026-10-05T08:00:00.000Z',
      expectedAccessUsable: false,
      expectedRefreshUsable: true,
    },
    {
      name: '兩份都過期了，沒救了',
      access: '2026-09-05T07:59:59.000Z',
      refresh: '2026-09-04T08:00:00.000Z',
      expectedAccessUsable: false,
      expectedRefreshUsable: false,
    },
    {
      name: '登入憑證正好到期於現在',
      access: '2026-09-05T08:00:00.000Z',
      refresh: '2026-10-05T08:00:00.000Z',
      expectedAccessUsable: false,
      expectedRefreshUsable: true,
    },
    {
      name: '續用憑證正好到期於現在',
      access: '2026-09-05T08:15:00.000Z',
      refresh: '2026-09-05T08:00:00.000Z',
      expectedAccessUsable: true,
      expectedRefreshUsable: false,
    },
  ])('$name', ({ access, refresh, expectedAccessUsable, expectedRefreshUsable }) => {
    // 「正好到期」算過期：到期時刻是第一個不能用的瞬間，不是最後一個還能用的。
    const session = sessionExpiringAt(access, refresh).toDomain()

    expect(session.accessTokenUsable(NOW)).toBe(expectedAccessUsable)
    expect(session.refreshTokenUsable(NOW)).toBe(expectedRefreshUsable)
  })

  it('兩份憑證原樣交給要帶著它們去找後端的那一邊', () => {
    const session = sessionExpiringAt(
      '2026-09-05T08:15:00.000Z', '2026-10-05T08:00:00.000Z').toDomain()

    expect(session.accessToken()).toBe('an-access-token')
    expect(session.refreshToken()).toBe('a-refresh-token')
  })
})
