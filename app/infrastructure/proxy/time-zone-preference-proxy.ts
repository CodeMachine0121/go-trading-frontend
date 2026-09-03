import type { ITimeZonePreferenceProxy } from '~/domain/interface/i-time-zone-preference-proxy'

/** 記在瀏覽器儲存裡的鍵。換名字等於忘掉所有人的選擇，所以只寫在這裡一次。 */
const SELECTED_TIME_ZONE_STORAGE_KEY = 'go-trading:selected-time-zone'

/**
 * Proxy：唯一允許碰瀏覽器儲存的地方。
 *
 * 讀不到就是「沒有記住」——瀏覽器把儲存關掉（無痕視窗、封鎖網站資料）時
 * 存取本身會拋出例外，那與「還沒選過」對使用者是同一件事：用預設的那一個。
 * 寫不進去也一樣不該讓畫面停住，選擇只是這一次不會被記得。
 */
export class TimeZonePreferenceProxy implements ITimeZonePreferenceProxy {
  readSelectedTimeZoneIdentifier(): string | null {
    try {
      return localStorage.getItem(SELECTED_TIME_ZONE_STORAGE_KEY)
    }
    catch {
      return null
    }
  }

  writeSelectedTimeZoneIdentifier(identifier: string): void {
    try {
      localStorage.setItem(SELECTED_TIME_ZONE_STORAGE_KEY, identifier)
    }
    catch {
      // 記不住不影響這一次的操作：畫面已經照新時區呈現，只是下次打開會回到預設。
    }
  }
}
