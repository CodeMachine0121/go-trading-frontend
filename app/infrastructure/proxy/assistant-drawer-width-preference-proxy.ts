import type { IAssistantDrawerWidthPreferenceProxy } from '~/domain/interface/i-assistant-drawer-width-preference-proxy'

/** 記在瀏覽器儲存裡的鍵。換名字等於忘掉使用者拉過的寬度，所以只寫在這裡一次。 */
const DRAWER_WIDTH_STORAGE_KEY = 'go-trading:assistant-drawer-width'

/**
 * Proxy：允許碰瀏覽器儲存的地方之一。
 *
 * 讀不出來就是「沒拉過」——瀏覽器把儲存關掉（無痕視窗、封鎖網站資料）時存取本身會拋出例外，
 * 而那與「還沒拉過」對使用者是同一件事：抽屜回到預設寬度。
 * 記著的東西壞掉（被別的程式寫過、格式變了）也一樣走這條路。
 *
 * 寫不進去同樣不該讓畫面停住：這一次已經拉成那樣了，只是下次打開會回到預設。
 */
export class AssistantDrawerWidthPreferenceProxy implements IAssistantDrawerWidthPreferenceProxy {
  readDrawerWidth(): number | null {
    try {
      return this.parse(localStorage.getItem(DRAWER_WIDTH_STORAGE_KEY))
    }
    catch {
      return null
    }
  }

  writeDrawerWidth(width: number): void {
    try {
      localStorage.setItem(DRAWER_WIDTH_STORAGE_KEY, `${width}`)
    }
    catch {
      // 記不住不影響這一次的操作：抽屜已經是使用者拉成的那個寬度了。
    }
  }

  /**
   * 把記著的那一行讀回一個寬度。讀不出來、不是有限的數字、或不大於零，
   * 一律當作沒有記住——一個說不通的寬度比沒有寬度更難處理。
   */
  private parse(storedValue: string | null): number | null {
    if (storedValue === null) {
      return null
    }

    const width = Number(storedValue)

    return Number.isFinite(width) && width > 0 ? width : null
  }
}
