import { AccessTokenDomain } from '~/domain/models/domains/access-token-domain'

/**
 * Entity：一份登入憑證——憑證本身，以及它到什麼時候為止還算數。
 *
 * 到期時刻跟著憑證一起收下來，而不是等用壞了才發現，因為那樣的「發現」
 * 是一次多餘的來回：拿一份自己都知道已經過期的憑證去問後端，答案是可以先算出來的。
 */
export class AccessToken {
  constructor(
    public readonly accessToken: string,
    public readonly expiresAt: Date,
  ) {}

  toDomain(): AccessTokenDomain {
    return new AccessTokenDomain(this)
  }
}
