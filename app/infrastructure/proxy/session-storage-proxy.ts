import type { ISessionStorageProxy } from '~/domain/interface/i-session-storage-proxy'
import { Session } from '~/domain/models/entities/session'

/**
 * 記在瀏覽器儲存裡的鍵。**沿用上一版的名字**：換掉會讓所有人被登出一次，
 * 而不換的話舊格式會被下面的正規化當成壞掉的紀錄——結果一樣是登出一次。
 * 既然結果相同，就選少一個要記得的東西的那一邊。
 */
const SESSION_STORAGE_KEY = 'go-trading:access-token'

/** 記在儲存裡的原始形狀，只存在於本檔內。 */
type StoredSession = {
  accessToken?: unknown
  expiresAt?: unknown
  refreshToken?: unknown
  refreshTokenExpiresAt?: unknown
}

/**
 * Proxy：唯一允許碰瀏覽器儲存的地方。
 *
 * 三個方法都**不拋**。瀏覽器把儲存關掉（無痕視窗、封鎖網站資料）時存取本身會拋，
 * 而那與「還沒登入過」對使用者是同一件事。寫不進去也一樣不該讓登入失敗——
 * 畫面已經是登入狀態了，只是下次打開要重登。
 */
export class SessionStorageProxy implements ISessionStorageProxy {
  readSession(): Session | null {
    try {
      const storedValue = localStorage.getItem(SESSION_STORAGE_KEY)
      if (storedValue === null) {
        return null
      }

      return this.toSession(JSON.parse(storedValue) as StoredSession)
    }
    catch {
      return null
    }
  }

  writeSession(session: Session): void {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        accessToken: session.accessToken,
        expiresAt: session.accessTokenExpiresAt.toISOString(),
        refreshToken: session.refreshToken,
        refreshTokenExpiresAt: session.refreshTokenExpiresAt.toISOString(),
      }))
    }
    catch {
      // 記不住不影響這一次：畫面已經是登入狀態，只是下次打開要重登。
    }
  }

  clearSession(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY)
    }
    catch {
      // 清不掉也不能讓登出這個動作失敗——它在畫面上一定要成功。
    }
  }

  /**
   * 把讀回來的東西收乾淨。少任何一樣、型別不對、時刻讀不出來，一律當成沒有記過。
   *
   * **半份登入階段比沒有登入階段更難處理**，而它們能做的事一樣多——
   * 上一版留下來的舊格式（只有一份憑證）也走這條路變成「沒有記過」，
   * 於是升級這件事對使用者就只是被登出一次。
   */
  private toSession(storedSession: StoredSession): Session | null {
    const accessTokenExpiresAt = this.momentIn(storedSession.expiresAt)
    const refreshTokenExpiresAt = this.momentIn(storedSession.refreshTokenExpiresAt)

    if (!this.isPresent(storedSession.accessToken) || accessTokenExpiresAt === null) {
      return null
    }
    if (!this.isPresent(storedSession.refreshToken) || refreshTokenExpiresAt === null) {
      return null
    }

    return new Session(
      storedSession.accessToken,
      accessTokenExpiresAt,
      storedSession.refreshToken,
      refreshTokenExpiresAt,
    )
  }

  private isPresent(value: unknown): value is string {
    return typeof value === 'string' && value !== ''
  }

  private momentIn(value: unknown): Date | null {
    if (typeof value !== 'string') {
      return null
    }

    const moment = new Date(value)

    return Number.isNaN(moment.getTime()) ? null : moment
  }
}
