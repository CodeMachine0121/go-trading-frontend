/**
 * 哨兵錯誤：算式本身的問題——無法解讀、缺少進入點、執行時失敗、
 * 試圖取用不該取用的東西，或算太久被中止。
 *
 * 與 BackendRequestRejectedError 分開，是因為使用者的下一步不同：
 * 這個要改的是算式，那個要改的是根數。讓畫面靠比對訊息字串去猜，
 * 後端改一句話畫面就壞。
 */
export class IndicatorScriptFailedError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'IndicatorScriptFailedError'
  }
}
