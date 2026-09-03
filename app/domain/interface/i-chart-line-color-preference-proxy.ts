/**
 * 介面以「能力」命名，不以供應商命名：它說的是「記住一條指標線的顏色」，
 * 不是「用瀏覽器儲存」。哪天改成存在後端，這個名字一個字都不必改。
 *
 * 實作在 app/infrastructure/proxy/chart-line-color-preference-proxy.ts。
 */
export interface IChartLineColorPreferenceProxy {
  /** 這條線挑過的顏色，沒挑過（或讀不到）時是 null。 */
  readColorToken(lineKey: string): string | null
  writeColorToken(lineKey: string, colorToken: string): void
}
