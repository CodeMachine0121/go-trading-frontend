import type { IAccessTokenStorageProxy } from '~/domain/interface/i-access-token-storage-proxy'
import { AccessToken } from '~/domain/models/entities/access-token'

/** 記在瀏覽器儲存裡的鍵。換名字等於把所有人登出，所以只寫在這裡一次。 */
const ACCESS_TOKEN_STORAGE_KEY = 'go-trading:access-token'

/** 記在儲存裡的原始形狀，只存在於本檔內。與 wire 型別同理：不外流進 domain。 */
type StoredAccessToken = {
  accessToken?: unknown
  expiresAt?: unknown
}

/**
 * Proxy：唯一允許碰瀏覽器儲存的地方。
 *
 * 三個方法都**不拋**。瀏覽器把儲存關掉（無痕視窗、封鎖網站資料）時，存取本身會拋出例外，
 * 而那與「還沒登入過」對使用者是同一件事。寫不進去也一樣不該讓登入失敗——
 * 畫面已經是登入狀態了，只是下次打開要重登。
 *
 * 記著的東西壞掉（被人手動改過、或換過格式）同樣回 null：一份讀不懂的紀錄
 * 與沒有紀錄，能做的事完全一樣。
 */
export class AccessTokenStorageProxy implements IAccessTokenStorageProxy {
  readAccessToken(): AccessToken | null {
    try {
      const storedValue = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
      if (storedValue === null) {
        return null
      }

      return this.toAccessToken(JSON.parse(storedValue) as StoredAccessToken)
    }
    catch {
      return null
    }
  }

  writeAccessToken(accessToken: AccessToken): void {
    try {
      localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, JSON.stringify({
        accessToken: accessToken.accessToken,
        expiresAt: accessToken.expiresAt.toISOString(),
      }))
    }
    catch {
      // 記不住不影響這一次：畫面已經是登入狀態，只是下次打開要重登。
    }
  }

  clearAccessToken(): void {
    try {
      localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    }
    catch {
      // 清不掉也不能讓登出這個動作失敗——它在畫面上一定要成功。
    }
  }

  /**
   * 把讀回來的東西收乾淨。少一個欄位、型別不對、時刻讀不出來，一律當成沒有紀錄——
   * 半份憑證比沒有憑證更難處理，而它們能做的事一樣多。
   */
  private toAccessToken(storedAccessToken: StoredAccessToken): AccessToken | null {
    if (typeof storedAccessToken.accessToken !== 'string' || storedAccessToken.accessToken === '') {
      return null
    }
    if (typeof storedAccessToken.expiresAt !== 'string') {
      return null
    }

    const expiresAt = new Date(storedAccessToken.expiresAt)
    if (Number.isNaN(expiresAt.getTime())) {
      return null
    }

    return new AccessToken(storedAccessToken.accessToken, expiresAt)
  }
}
