/**
 * 哨兵錯誤：後端收到了請求，但以業務規則拒絕（例如區間過大、找不到指定的 K 線）。
 *
 * 與 BackendUnreachableError 的差別在於使用者該做什麼：
 * 這個錯誤要如實轉達後端給的原因，讓使用者調整輸入；那個錯誤要請使用者去把後端啟動起來。
 */
export class BackendRequestRejectedError extends Error {
  /**
   * 後端回應的狀態碼。它只在 infrastructure 層被解讀——
   * proxy 據以把某些拒絕翻譯成更精確的領域錯誤（例如「算式的問題」）。
   * 領域與畫面一律只認錯誤型別，不認狀態碼。
   */
  readonly status: number | undefined

  constructor(message: string, options?: { cause?: unknown, status?: number }) {
    super(message, { cause: options?.cause })
    this.name = 'BackendRequestRejectedError'
    this.status = options?.status
  }
}
