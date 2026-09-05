import type { Session } from '~/domain/models/entities/session'

/**
 * Domain Model：這一對憑證各自還算不算數。
 *
 * 兩個問題分開問，而且刻意沒有一個把它們合起來的答案——它們導向的動作完全不同：
 * 登入憑證過期了還有救（拿續用憑證去換一份），續用憑證過期了就沒救了（回登入畫面）。
 * 合成一個布林，這個切片就沒有東西可做了。
 *
 * 「正好到期」算過期。到期時刻是第一個不能用的瞬間，不是最後一個還能用的——
 * 那才與後端拒絕過期憑證的那條線是同一條。
 */
export class SessionDomain {
  private readonly session: Session

  constructor(session: Session) {
    this.session = session
  }

  accessTokenUsable(now: Date): boolean {
    return this.session.accessTokenExpiresAt.getTime() > now.getTime()
  }

  refreshTokenUsable(now: Date): boolean {
    return this.session.refreshTokenExpiresAt.getTime() > now.getTime()
  }

  accessToken(): string {
    return this.session.accessToken
  }

  refreshToken(): string {
    return this.session.refreshToken
  }
}
