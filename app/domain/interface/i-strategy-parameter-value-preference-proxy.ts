/**
 * 介面以「能力」命名，不以供應商命名：它說的是「記住一個旋鈕被調成什麼」，
 * 不是「用瀏覽器儲存」。哪天改成存在後端，這個名字一個字都不必改。
 *
 * **逐個名稱讀寫，而不是交出一整份表。** 鍵怎麼組只有領域知道；
 * 交出一份表就等於要求外面也會組同一把鑰匙，而兩邊一旦組得不一樣，
 * 記憶會**安靜地**消失：沒有錯誤，只是每次打開都回到預設值。
 *
 * 實作在 app/infrastructure/proxy/strategy-parameter-value-preference-proxy.ts。
 */
export interface IStrategyParameterValuePreferenceProxy {
  /** 這支策略的這個旋鈕上次被調成什麼，沒調過（或讀不到）時是 null。 */
  readValue(strategyId: number, parameterName: string): number | null
  writeValue(strategyId: number, parameterName: string, value: number): void
}
