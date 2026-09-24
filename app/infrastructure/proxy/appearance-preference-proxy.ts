import type { IAppearancePreferenceProxy } from '~/domain/interface/i-appearance-preference-proxy'

const APPEARANCE_STORAGE_KEY = 'go-trading:appearance'

export class AppearancePreferenceProxy implements IAppearancePreferenceProxy {
  readAppearanceChoice(): string | null {
    try {
      return localStorage.getItem(APPEARANCE_STORAGE_KEY)
    }
    catch {
      // 私密視窗或封鎖了網站資料：當作從沒選過。
      return null
    }
  }

  writeAppearanceChoice(choice: string): void {
    try {
      localStorage.setItem(APPEARANCE_STORAGE_KEY, choice)
    }
    catch {
      // 記不住就算了：這一次的選擇照樣套在畫面上，只是下次打開回到跟隨系統。
    }
  }
}
