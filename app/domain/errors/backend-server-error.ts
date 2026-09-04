/**
 * 哨兵錯誤：後端自己出了問題（例如讀不到資料庫），不是使用者的輸入有問題。
 *
 * 與 BackendRequestRejectedError 分開，是因為使用者的下一步不同：
 * 那個要改輸入，這個改什麼都沒用，只能稍後重試。
 * 把後端的故障說成「請求的問題」，會讓使用者一直修一份從來沒錯的請求。
 */
export class BackendServerError extends Error {
  /**
   * 後端回應的狀態碼。它只在 infrastructure 層被解讀——
   * proxy 據以把某些故障翻譯成更精確的領域錯誤（例如「後端活著，但它後面那位助手不在」）。
   * 領域與畫面一律只認錯誤型別，不認狀態碼。
   *
   * 與 BackendRequestRejectedError 帶著它是同一個理由：五百開頭的狀態碼不只一種，
   * 而「它自己壞了」與「它請的人沒回應」對使用者是兩件事。
   */
  readonly status: number | undefined

  constructor(message: string, options?: { cause?: unknown, status?: number }) {
    super(message, { cause: options?.cause })
    this.name = 'BackendServerError'
    this.status = options?.status
  }
}
