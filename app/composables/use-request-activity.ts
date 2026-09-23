/**
 * 等多久還沒回來，進度條才出現。
 *
 * 一眨眼就回來的那一發不該讓進度條冒出來又消失——那只是在畫面頂端閃一下，
 * 看的人什麼都來不及讀，只會以為哪裡出了事。
 */
const WAITING_VISIBLE_AFTER_MILLISECONDS = 200

/**
 * 全站共用的「畫面正在等系統回話」。
 *
 * 它是跨畫面共用的狀態（`useState`），因為在等的事與顯示它的那一條進度條本來就不在同一處：
 * 每一發請求都從發請求的那一層報到，而進度條只有一條，掛在應用程式的根上。
 * 換頁也算一件——換頁時同一條進度條走一次，不另開一條。
 *
 * **只有一個數字在數**：同時等好幾件時只有一條進度條，最後一件回來才收。
 * 計數而不是一個布林，是因為兩件事一前一後回來時，布林會在第一件回來時就把進度條收掉，
 * 而第二件還在等。
 */
export function useRequestActivity() {
  const waitingCount = useState('request-activity-waiting-count', () => 0)
  const visible = useState('request-activity-visible', () => false)
  const revealTimer = useState<ReturnType<typeof setTimeout> | null>(
    'request-activity-reveal-timer', () => null)

  /**
   * 開始等一件事。回傳的是「這一件結束了」。
   *
   * 回傳一個結束函式而不是另外開一個 `endWaiting()`：後者要呼叫端自己記得配對，
   * 而多叫一次就會把別人還在等的那一件也算成結束了。結束函式**叫兩次只算一次**，
   * 所以任何一個 `finally` 都可以放心呼叫它。
   */
  function beginWaiting(): () => void {
    waitingCount.value += 1

    if (waitingCount.value === 1) {
      revealTimer.value = setTimeout(() => {
        revealTimer.value = null
        visible.value = true
      }, WAITING_VISIBLE_AFTER_MILLISECONDS)
    }

    let ended = false

    return () => {
      if (ended) {
        return
      }
      ended = true
      waitingCount.value -= 1

      if (waitingCount.value === 0) {
        if (revealTimer.value !== null) {
          clearTimeout(revealTimer.value)
          revealTimer.value = null
        }
        visible.value = false
      }
    }
  }

  /**
   * 換頁也算一件在等的事——同一條進度條走一次，不另開一條只給換頁用的。
   *
   * 由應用程式的根叫一次。一次只會有一次換頁：新的開始時，上一次必然已經不算數了，
   * 所以開始之前先把上一次結束掉；換頁到一半出錯時「換完了」那一聲不會來，
   * 所以出錯也算結束——少了它，進度條會一直跑到下一次換頁。
   */
  function followNavigation(): void {
    const nuxtApp = useNuxtApp()
    let endNavigation: (() => void) | null = null

    const finishNavigation = () => {
      endNavigation?.()
      endNavigation = null
    }

    nuxtApp.hook('page:loading:start', () => {
      finishNavigation()
      endNavigation = beginWaiting()
    })
    nuxtApp.hook('page:loading:end', finishNavigation)
    nuxtApp.hook('vue:error', finishNavigation)
  }

  return { visible: readonly(visible), beginWaiting, followNavigation }
}
