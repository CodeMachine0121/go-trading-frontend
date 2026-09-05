import type { AccessToken } from '~/domain/models/entities/access-token'

/**
 * Domain Model：一份憑證還算不算數。
 *
 * 「正好到期」算過期，不算還能用。差別只有一瞬間，但選另一邊就得解釋
 * 「到期時刻」到底是最後一個能用的瞬間、還是第一個不能用的瞬間——
 * 後者是唯一講得通的讀法，因為它與後端拒絕過期憑證的那條線是同一條。
 */
export class AccessTokenDomain {
  private readonly accessTokenValue: string
  private readonly expiresAt: Date

  constructor(accessToken: AccessToken) {
    this.accessTokenValue = accessToken.accessToken
    this.expiresAt = accessToken.expiresAt
  }

  isUsable(now: Date): boolean {
    return this.expiresAt.getTime() > now.getTime()
  }

  /** 憑證本身，交給要帶著它去問後端的那一邊。 */
  value(): string {
    return this.accessTokenValue
  }
}
