/**
 * 介面以「能力」命名：記住這台裝置選的顯示語言，並讀出這台瀏覽器偏好的語言。
 * 實作在 app/infrastructure/proxy/display-language-preference-proxy.ts。
 */
export interface IDisplayLanguagePreferenceProxy {
  /** 讀回記住的語言代碼；沒有記住任何東西時回傳 null。 */
  readSelectedLanguageCode(): string | null

  /** 記住這個語言代碼，供下次打開時讀回。 */
  writeSelectedLanguageCode(code: string): void

  /** 瀏覽器偏好的語言標籤，依偏好先後（`en-US`、`zh-TW`…）；讀不到時是空的。 */
  readBrowserLanguageTags(): readonly string[]
}
