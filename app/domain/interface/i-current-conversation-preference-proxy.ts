/**
 * 介面以「能力」命名：這個能力是「記住這台裝置正在看哪一段對話」。
 *
 * 它存在的理由只有一個：**整頁重新載入之後要回到同一段對話**。助手現在可能寫好幾分鐘，
 * 而使用者最可能重整的時機，正是他等最久、最懷疑畫面壞掉的那一刻——
 * 重整後看到一段空白的新對話，他會以為沒送出去，再問一次，付第二次錢。
 *
 * 記著的只有識別碼。對話的內容是後端的事，這裡不快取任何一則訊息。
 * 目前由瀏覽器儲存實作；換成後端偏好設定時，介面一個字都不必改。
 * 實作在 app/infrastructure/proxy/current-conversation-preference-proxy.ts。
 */
export interface ICurrentConversationPreferenceProxy {
  /** 讀回記著的那一段；沒有記過、或記著的東西讀不出來時回傳 null。 */
  readCurrentConversationId(): number | null

  /** 記住正在看的那一段，供下次打開時讀回。 */
  writeCurrentConversationId(conversationId: number): void

  /** 忘掉它。開一段新對話時用——那時候還沒有一段可以記。 */
  forgetCurrentConversationId(): void
}
