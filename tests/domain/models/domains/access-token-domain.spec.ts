import { describe, expect, it } from 'vitest'
import { AccessToken } from '~/domain/models/entities/access-token'

const NOW = new Date('2026-09-05T08:00:00.000Z')

function accessTokenExpiringAt(expiresAt: string): AccessToken {
  return new AccessToken('a-signed-token', new Date(expiresAt))
}

describe('AccessTokenDomain：這份憑證還算不算數', () => {
  it.each([
    { name: '明天才到期', expiresAt: '2026-09-06T08:00:00.000Z', expectedUsable: true },
    { name: '再一秒才到期', expiresAt: '2026-09-05T08:00:01.000Z', expectedUsable: true },
    { name: '正好就是現在', expiresAt: '2026-09-05T08:00:00.000Z', expectedUsable: false },
    { name: '一秒前就到期了', expiresAt: '2026-09-05T07:59:59.000Z', expectedUsable: false },
  ])('$name → $expectedUsable', ({ expiresAt, expectedUsable }) => {
    // 「正好到期」算過期：到期時刻是第一個不能用的瞬間，不是最後一個能用的——
    // 那才與後端拒絕過期憑證的那條線是同一條。
    expect(accessTokenExpiringAt(expiresAt).toDomain().isUsable(NOW)).toBe(expectedUsable)
  })

  it('憑證本身原樣交給要帶著它去問後端的那一邊', () => {
    expect(accessTokenExpiringAt('2026-09-06T08:00:00.000Z').toDomain().value())
      .toBe('a-signed-token')
  })
})
