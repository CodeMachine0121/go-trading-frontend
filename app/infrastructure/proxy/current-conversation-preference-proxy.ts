import type { ICurrentConversationPreferenceProxy } from '~/domain/interface/i-current-conversation-preference-proxy'

/** 記在瀏覽器儲存裡的鍵。換名字等於忘掉使用者正在看的那一段，所以只寫在這裡一次。 */
const CURRENT_CONVERSATION_STORAGE_KEY = 'go-trading:assistant-current-conversation'

/**
 * Proxy：允許碰瀏覽器儲存的地方之一。
 *
 * 讀不出來就是「還沒有一段對話」——瀏覽器把儲存關掉（無痕視窗、封鎖網站資料）時
 * 存取本身會拋出例外，而那與「還沒問過任何問題」對使用者是同一件事：回到一段新對話。
 * 記著的東西壞掉（被別的程式寫過、格式變了）也一樣走這條路。
 *
 * 寫不進去同樣不該讓畫面停住：這一次照樣問得到，只是重新整理之後會回到一段新的。
 */
export class CurrentConversationPreferenceProxy implements ICurrentConversationPreferenceProxy {
  readCurrentConversationId(): number | null {
    try {
      return this.parse(localStorage.getItem(CURRENT_CONVERSATION_STORAGE_KEY))
    }
    catch {
      return null
    }
  }

  writeCurrentConversationId(conversationId: number): void {
    try {
      localStorage.setItem(CURRENT_CONVERSATION_STORAGE_KEY, `${conversationId}`)
    }
    catch {
      // 記不住不影響這一次的對話，只影響下一次打開時停在哪裡。
    }
  }

  forgetCurrentConversationId(): void {
    try {
      localStorage.removeItem(CURRENT_CONVERSATION_STORAGE_KEY)
    }
    catch {
      // 忘不掉的下場是下次打開時回到舊的那一段，使用者再按一次開新對話就好。
    }
  }

  /**
   * 把記著的那一行讀回一個識別碼。讀不出來、不是有限的整數、或不大於零，
   * 一律當作沒有記住——一個說不通的識別碼比沒有識別碼更難處理：
   * 拿它去讀會得到一句「找不到這段對話」，而使用者根本沒有指名過它。
   */
  private parse(storedValue: string | null): number | null {
    if (storedValue === null) {
      return null
    }

    const conversationId = Number(storedValue)

    return Number.isInteger(conversationId) && conversationId > 0 ? conversationId : null
  }
}
