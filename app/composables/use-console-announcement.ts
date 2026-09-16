/**
 * 「剛剛那件事成了」那一句話，跨得過一次換頁。
 *
 * 它必須跨頁，因為說這句話的地方與該看到它的地方**本來就不同一頁**：
 * 存好一台機器人的是工作台，而存完之後使用者已經被送回清單了。
 * 留在工作台說的話，會在換頁的那一瞬間跟著消失——等於沒說。
 *
 * 用 `useState` 而不是一個模組層的變數：模組層的變數在伺服器上是**所有請求共用的**，
 * 一個人存好的訊息會出現在另一個人的畫面上。這裡只有一個使用者，
 * 但那種錯誤不會因為只有一個人就變得比較好找。
 *
 * 計時器由這裡拿著，不交給畫它的那個元件：連著做兩件事時會有兩個計時器數同一格位子，
 * 先到的那個會把後來的話收掉。
 */
const ANNOUNCEMENT_VISIBLE_MILLISECONDS = 4000

export function useConsoleAnnouncement() {
  const announcement = useState<string>('console-announcement', () => '')
  const timer = useState<ReturnType<typeof setTimeout> | null>('console-announcement-timer',
    () => null)

  /**
   * 說一句話。四秒後自己收掉。
   *
   * 收掉的計時器在**這裡**啟動而不是在讀到它的那一頁，是因為換頁時讀它的那一頁
   * 才剛掛上來——由它啟動的話，換頁慢一點那句話就會多留一會兒，快一點就少留一會兒。
   */
  function announce(message: string) {
    announcement.value = message

    if (timer.value !== null) {
      clearTimeout(timer.value)
    }
    timer.value = setTimeout(() => {
      announcement.value = ''
      timer.value = null
    }, ANNOUNCEMENT_VISIBLE_MILLISECONDS)
  }

  return { announcement, announce }
}
