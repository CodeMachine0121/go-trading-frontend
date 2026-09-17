/**
 * 一次問答走到哪裡，三選一。沿用後端同名詞彙，一字不差。
 *
 * 畫面的等待與失敗說明都由它決定，而它**來自後端**——這正是重新整理之後
 * 還看得到的原因：真相在後端那一列上，畫面只是把它畫出來。
 */
export type AssistantTurnStatus = 'running' | 'answered' | 'failed'

/**
 * 認不出來的狀態一律當成失敗。
 *
 * 讀成進行中會是一個永遠轉不完的圈，而且那一段對話再也送不出下一句；
 * 讀成已回答會把一個空的回答畫成助手什麼都沒說。當成失敗最壞的情況
 * 只是叫使用者再問一次。
 */
export function assistantTurnStatusOf(status: string): AssistantTurnStatus {
  if (status === 'running' || status === 'answered') {
    return status
  }

  return 'failed'
}
