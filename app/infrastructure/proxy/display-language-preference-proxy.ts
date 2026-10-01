import type { IDisplayLanguagePreferenceProxy } from '~/domain/interface/i-display-language-preference-proxy'

/** 記在瀏覽器儲存裡的鍵。換名字等於忘掉所有人的選擇，所以只寫在這裡一次。 */
const SELECTED_DISPLAY_LANGUAGE_STORAGE_KEY = 'go-trading:selected-display-language'

/**
 * Proxy：唯一碰瀏覽器儲存與瀏覽器語言偏好的地方。
 *
 * 讀不到就是「沒有記住」——瀏覽器把儲存關掉時存取本身會拋出例外，那與「還沒選過」
 * 對使用者是同一件事。寫不進去也一樣不該讓畫面停住，選擇只是這一次不會被記得。
 */
export class DisplayLanguagePreferenceProxy implements IDisplayLanguagePreferenceProxy {
  readSelectedLanguageCode(): string | null {
    try {
      return localStorage.getItem(SELECTED_DISPLAY_LANGUAGE_STORAGE_KEY)
    }
    catch {
      return null
    }
  }

  writeSelectedLanguageCode(code: string): void {
    try {
      localStorage.setItem(SELECTED_DISPLAY_LANGUAGE_STORAGE_KEY, code)
    }
    catch {
      // 記不住不影響這一次的操作：畫面已經換了語言，只是下次打開會重新判斷。
    }
  }

  readBrowserLanguageTags(): readonly string[] {
    return navigator.languages ?? []
  }
}
