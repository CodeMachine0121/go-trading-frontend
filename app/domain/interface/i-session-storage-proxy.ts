import type { Session } from '~/domain/models/entities/session'

/**
 * 介面以「能力」命名，不以供應商命名：這個能力是「記住這台瀏覽器手上的那一段登入階段」。
 * 目前由瀏覽器儲存實作；改記在 cookie（好讓伺服器端也判斷得出來）時，介面一個字都不必改。
 *
 * **三個方法都不會拋。** 記不住、讀不到、清不掉，對使用者都不是需要處理的錯誤：
 * 讀不到等同還沒登入過；記不住只代表下次打開要重登，而這一次仍然操作得起來；
 * 清不掉更不能讓登出這個動作失敗。
 */
export interface ISessionStorageProxy {
  /** 讀回記著的那一段；沒有記住、或記著的東西已經壞掉時回傳 null。 */
  readSession(): Session | null

  /** 記住這一段，供下次打開時讀回。 */
  writeSession(session: Session): void

  /** 忘掉記著的那一段。 */
  clearSession(): void
}
