/**
 * 介面以「能力」命名，不以供應商命名：這個能力是「記住這台裝置把抽屜拉成多寬」。
 * 目前由瀏覽器儲存實作；換成後端偏好設定時，介面一個字都不必改。
 * 實作在 app/infrastructure/proxy/assistant-drawer-width-preference-proxy.ts。
 */
export interface IAssistantDrawerWidthPreferenceProxy {
  /** 讀回記住的寬度；沒有拉過、或記著的東西讀不出來時回傳 null。 */
  readDrawerWidth(): number | null

  /** 記住這個寬度，供下次打開時讀回。 */
  writeDrawerWidth(width: number): void
}
