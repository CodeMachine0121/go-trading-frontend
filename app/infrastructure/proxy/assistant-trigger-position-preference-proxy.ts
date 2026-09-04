import type { IAssistantTriggerPositionPreferenceProxy } from '~/domain/interface/i-assistant-trigger-position-preference-proxy'
import { AssistantTriggerPositionDto } from '~/domain/models/dto/assistant-trigger-position-dto'

/** 記在瀏覽器儲存裡的鍵。換名字等於忘掉使用者擺過的位置，所以只寫在這裡一次。 */
const TRIGGER_POSITION_STORAGE_KEY = 'go-trading:assistant-trigger-position'

/** 記的是「離右邊多遠,離下面多遠」兩個數字。 */
const STORED_VALUE_SEPARATOR = ','

/**
 * Proxy：允許碰瀏覽器儲存的地方之一（另外是顯示時區、線色與圖上的指標）。
 *
 * 讀不出來就是「沒擺過」——瀏覽器把儲存關掉（無痕視窗、封鎖網站資料）時存取本身會拋出例外，
 * 而那與「還沒擺過」對使用者是同一件事：那顆鍵回到右下角。
 * 記著的東西壞掉（被別的程式寫過、格式變了）也一樣走這條路，
 * 因為一個讀不出來的位置與沒有位置是同一種情況。
 *
 * 寫不進去同樣不該讓畫面停住：這一次已經拖到那裡了，只是下次打開會回到右下角。
 */
export class AssistantTriggerPositionPreferenceProxy implements IAssistantTriggerPositionPreferenceProxy {
  readTriggerPosition(): AssistantTriggerPositionDto | null {
    try {
      return this.parse(localStorage.getItem(TRIGGER_POSITION_STORAGE_KEY))
    }
    catch {
      return null
    }
  }

  writeTriggerPosition(position: AssistantTriggerPositionDto): void {
    try {
      localStorage.setItem(
        TRIGGER_POSITION_STORAGE_KEY,
        `${position.right}${STORED_VALUE_SEPARATOR}${position.bottom}`,
      )
    }
    catch {
      // 記不住不影響這一次的操作：那顆鍵已經在使用者放下它的地方了。
    }
  }

  /**
   * 把記著的那一行讀回兩個數字。任何一個讀不出來、不是有限的數字、或是負數，
   * 整份就當作沒有記住——半個位置比沒有位置更難處理。
   */
  private parse(storedValue: string | null): AssistantTriggerPositionDto | null {
    if (storedValue === null) {
      return null
    }

    const [storedRight, storedBottom] = storedValue.split(STORED_VALUE_SEPARATOR)
    const right = Number(storedRight)
    const bottom = Number(storedBottom)

    if (!Number.isFinite(right) || !Number.isFinite(bottom) || right < 0 || bottom < 0) {
      return null
    }

    return new AssistantTriggerPositionDto(right, bottom)
  }
}
