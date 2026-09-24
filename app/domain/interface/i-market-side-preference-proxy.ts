/**
 * 介面以「能力」命名：這個能力是「記住使用者最後待在現貨還是合約那一邊」。
 * 目前由瀏覽器儲存實作。實作在 app/infrastructure/proxy/market-side-preference-proxy.ts。
 */
export interface IMarketSidePreferenceProxy {
  /** 讀回記住的那一邊；沒有記住、或瀏覽器記不住時回傳 null。 */
  readMarketSide(): string | null

  /** 記住那一邊；瀏覽器記不住時安靜略過——這一次照樣生效。 */
  writeMarketSide(side: string): void
}
