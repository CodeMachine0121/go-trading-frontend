import type { IStrategyParameterValuePreferenceProxy } from '~/domain/interface/i-strategy-parameter-value-preference-proxy'

/** 記在瀏覽器儲存裡的鍵前綴。換名字等於忘掉所有調過的值，所以只寫在這裡一次。 */
const STRATEGY_PARAMETER_VALUE_STORAGE_PREFIX = 'go-trading:chart-strategy-parameter:'

/**
 * Proxy：允許碰瀏覽器儲存的第三個地方（另外兩個是顯示時區與指標線色）。
 *
 * 讀不到就是「沒調過」——瀏覽器把儲存關掉（無痕視窗、封鎖網站資料）時存取本身會拋出例外，
 * 那與「還沒調過」對使用者是同一件事：用策略記著的預設值。
 * 寫不進去也一樣不該讓畫面停住：這一次已經用調過的值算完了，只是下次打開會回到預設。
 *
 * 讀回來的東西不是數字時也當成沒調過：儲存裡放的是文字，
 * 而別的版本、別的分頁、甚至使用者自己都可能在那裡留下讀不成數字的東西。
 */
export class StrategyParameterValuePreferenceProxy
implements IStrategyParameterValuePreferenceProxy {
  readValue(strategyId: number, parameterName: string): number | null {
    try {
      const stored = localStorage.getItem(this.storageKeyOf(strategyId, parameterName))
      if (stored === null) {
        return null
      }

      const value = Number(stored)

      return Number.isFinite(value) ? value : null
    }
    catch {
      return null
    }
  }

  writeValue(strategyId: number, parameterName: string, value: number): void {
    try {
      localStorage.setItem(this.storageKeyOf(strategyId, parameterName), String(value))
    }
    catch {
      // 記不住不影響這一次的操作：圖上那條線已經用調過的值算完了。
    }
  }

  private storageKeyOf(strategyId: number, parameterName: string): string {
    return `${STRATEGY_PARAMETER_VALUE_STORAGE_PREFIX}${strategyId}:${parameterName}`
  }
}
