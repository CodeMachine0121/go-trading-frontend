/**
 * 哨兵錯誤：後端收到了請求，但以業務規則拒絕（例如區間過大、找不到指定的 K 線）。
 *
 * 與 BackendUnreachableError 的差別在於使用者該做什麼：
 * 這個錯誤要如實轉達後端給的原因，讓使用者調整輸入；那個錯誤要請使用者去把後端啟動起來。
 */
export class BackendRequestRejectedError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'BackendRequestRejectedError'
  }
}
