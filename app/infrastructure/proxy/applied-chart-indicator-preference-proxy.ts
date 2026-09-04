import type { IAppliedChartIndicatorPreferenceProxy } from '~/domain/interface/i-applied-chart-indicator-preference-proxy'
import { RememberedAppliedIndicatorVo } from '~/domain/models/vo/remembered-applied-indicator-vo'

/** 記在瀏覽器儲存裡的鍵。換名字等於忘掉所有人擺過的清單，所以只寫在這裡一次。 */
const APPLIED_CHART_INDICATORS_STORAGE_KEY = 'go-trading:chart-applied-indicators'

/**
 * 留存下來的 wire 形狀，只存在於本檔內，不外流進 domain。
 *
 * **每個欄位都是 `unknown`，這是刻意的。** 瀏覽器儲存裡的東西比後端回來的更不可信：
 * 另一個版本、另一個分頁、甚至使用者自己都可能在那裡留下讀不出來的東西。
 * 型別上不先假設它是對的，編譯器就會逼著這裡逐個欄位驗過才收。
 */
type AppliedChartIndicatorWire = {
  strategyId: unknown
  parameterValues: unknown
}

/**
 * Proxy：允許碰瀏覽器儲存的第四個地方（另外三個是顯示時區、指標線色、旋鈕調成什麼）。
 *
 * 讀不出來就是「沒擺過」——瀏覽器把儲存關掉（無痕視窗、封鎖網站資料）時存取本身會拋出例外，
 * 而那與「上次一支都沒擺」對使用者是同一件事：清單是空的，圖表照畫。
 * 寫不進去也一樣不該讓畫面停住：這一次已經擺上圖了，只是下次打開得再擺一遍。
 *
 * **壞掉的那一筆跳過，不是整份丟掉。** 三支指標裡有一支的留存被動過時，
 * 讓另外兩支照樣回來比讓使用者從零開始有用得多。
 */
export class AppliedChartIndicatorPreferenceProxy
implements IAppliedChartIndicatorPreferenceProxy {
  readAppliedChartIndicators(): RememberedAppliedIndicatorVo[] {
    try {
      const stored = localStorage.getItem(APPLIED_CHART_INDICATORS_STORAGE_KEY)
      if (stored === null) {
        return []
      }

      const wires: unknown = JSON.parse(stored)
      // 整份不是一個陣列（壞掉的 JSON 讀不到這裡，但一個物件、一個字串會）：當成沒擺過。
      if (!Array.isArray(wires)) {
        return []
      }

      return wires.flatMap(wire => this.toRememberedAppliedIndicatorVos(wire))
    }
    catch {
      return []
    }
  }

  writeAppliedChartIndicators(
    rememberedAppliedIndicatorVos: readonly RememberedAppliedIndicatorVo[],
  ): void {
    try {
      localStorage.setItem(
        APPLIED_CHART_INDICATORS_STORAGE_KEY,
        JSON.stringify(rememberedAppliedIndicatorVos.map(vo => this.toWire(vo))))
    }
    catch {
      // 記不住不影響這一次的操作：那幾支已經在圖上了。
    }
  }

  /**
   * 一筆讀得出來就交出一個，讀不出來就交出零個。
   *
   * 走訪找到的那些（零個或一個），比在呼叫端寫一個「這一筆是 null 就跳過」誠實——
   * 那個 null 會一路往上，而上面沒有任何一層需要知道「有一筆壞掉了」。
   */
  private toRememberedAppliedIndicatorVos(wire: unknown): RememberedAppliedIndicatorVo[] {
    if (typeof wire !== 'object' || wire === null || !('strategyId' in wire)) {
      return []
    }

    const { strategyId, parameterValues } = wire as AppliedChartIndicatorWire
    // 識別碼是拿去對回一支策略的鑰匙。它不是整數就沒有任何策略對得上。
    if (typeof strategyId !== 'number' || !Number.isInteger(strategyId)) {
      return []
    }

    return [new RememberedAppliedIndicatorVo(
      strategyId, this.toParameterValues(parameterValues))]
  }

  /**
   * 那幾格讀得出來的部分。讀不出來的格子跳過——它之後會拿到宣告的預設值，
   * 與「留存裡本來就沒有這個名字」是同一個落點。
   */
  private toParameterValues(parameterValues: unknown): ReadonlyMap<string, number> {
    const values = new Map<string, number>()
    if (typeof parameterValues !== 'object' || parameterValues === null) {
      return values
    }

    for (const name of Object.keys(parameterValues)) {
      const value: unknown = (parameterValues as Record<string, unknown>)[name]
      if (typeof value === 'number' && Number.isFinite(value)) {
        values.set(name, value)
      }
    }

    return values
  }

  private toWire(
    rememberedAppliedIndicatorVo: RememberedAppliedIndicatorVo,
  ): Record<string, unknown> {
    return {
      strategyId: rememberedAppliedIndicatorVo.strategyId,
      parameterValues: Object.fromEntries(rememberedAppliedIndicatorVo.parameterValues),
    }
  }
}
