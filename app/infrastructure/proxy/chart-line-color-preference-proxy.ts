import type { IChartLineColorPreferenceProxy } from '~/domain/interface/i-chart-line-color-preference-proxy'

/** 記在瀏覽器儲存裡的鍵前綴。換名字等於忘掉所有挑過的顏色，所以只寫在這裡一次。 */
const CHART_LINE_COLOR_STORAGE_PREFIX = 'go-trading:chart-line-color:'

/**
 * Proxy：允許碰瀏覽器儲存的第二個地方（另一個是顯示時區）。
 *
 * 讀不到就是「沒挑過」——瀏覽器把儲存關掉（無痕視窗、封鎖網站資料）時存取本身會拋出例外，
 * 那與「還沒挑過」對使用者是同一件事：用依序取到的那個顏色。
 * 寫不進去也一樣不該讓畫面停住：線這一次已經換色了，只是下次打開會回到預設。
 */
export class ChartLineColorPreferenceProxy implements IChartLineColorPreferenceProxy {
  readColorToken(lineKey: string): string | null {
    try {
      return localStorage.getItem(CHART_LINE_COLOR_STORAGE_PREFIX + lineKey)
    }
    catch {
      return null
    }
  }

  writeColorToken(lineKey: string, colorToken: string): void {
    try {
      localStorage.setItem(CHART_LINE_COLOR_STORAGE_PREFIX + lineKey, colorToken)
    }
    catch {
      // 記不住不影響這一次的操作：圖上那條線已經換色了。
    }
  }
}
