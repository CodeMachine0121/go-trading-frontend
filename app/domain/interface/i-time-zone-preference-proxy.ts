/**
 * 介面以「能力」命名，不以供應商命名：這個能力是「記住這台裝置選的時區」。
 * 目前由瀏覽器儲存實作；換成後端偏好設定時，介面一個字都不必改。
 * 實作在 app/infrastructure/proxy/time-zone-preference-proxy.ts。
 */
export interface ITimeZonePreferenceProxy {
  /** 讀回記住的時區識別字；沒有記住任何東西時回傳 null。 */
  readSelectedTimeZoneIdentifier(): string | null

  /** 記住這個時區識別字，供下次打開時讀回。 */
  writeSelectedTimeZoneIdentifier(identifier: string): void
}
