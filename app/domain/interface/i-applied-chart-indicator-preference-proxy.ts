import type { RememberedAppliedIndicatorVo } from '~/domain/models/vo/remembered-applied-indicator-vo'

/**
 * 介面以「能力」命名，不以供應商命名：它說的是「記住圖上擺著哪幾支指標」，
 * 不是「用瀏覽器儲存」。哪天改成存在後端讓另一台機器也看得到，這個名字一個字都不必改。
 *
 * **這一個交出整份清單，而旋鈕值那一個堅持逐個名稱讀寫**——兩者不矛盾。
 * 那條規則要防的是「鍵怎麼組漏到外面去」：整份清單就是**一個**答案、一把鍵，
 * 交出它沒有漏出任何鍵的組法。反過來若逐筆讀寫，外面就得先知道有幾筆、
 * 第幾筆放在哪把鍵上——那才是把鍵的組法漏了出去。
 *
 * **順序有意義**：它決定還原之後沒挑過顏色的那幾條線誰先拿到哪個顏色。
 *
 * 實作在 app/infrastructure/proxy/applied-chart-indicator-preference-proxy.ts。
 */
export interface IAppliedChartIndicatorPreferenceProxy {
  /** 上次圖上擺著哪幾筆，依原來的順序。沒擺過（或讀不出來）時是空的一份。 */
  readAppliedChartIndicators(): RememberedAppliedIndicatorVo[]
  writeAppliedChartIndicators(
    rememberedAppliedIndicatorVos: readonly RememberedAppliedIndicatorVo[]): void
}
