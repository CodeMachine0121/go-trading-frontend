/**
 * 介面以「能力」命名：這個能力是「記住這台裝置選的外觀」。
 * 目前由瀏覽器儲存實作。實作在 app/infrastructure/proxy/appearance-preference-proxy.ts。
 */
export interface IAppearancePreferenceProxy {
  /** 讀回記住的外觀選擇；沒有記住、或瀏覽器記不住時回傳 null。 */
  readAppearanceChoice(): string | null

  /** 記住這個外觀選擇；瀏覽器記不住時安靜略過——這一次照樣生效。 */
  writeAppearanceChoice(choice: string): void
}
