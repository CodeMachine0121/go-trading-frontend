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

  /**
   * 這次拒絕是關於哪一個策略參數，如果它是關於某一個的話。
   *
   * 它以一個欄位存在，而不是靠讀訊息認出來——訊息是寫給人看的，
   * 措辭一改，任何比對它的程式就跟著壞掉。目前只有「名字對不上」那一種拒絕會帶它。
   */
  readonly parameterName: string | undefined

  /**
   * 這次拒絕是關於**哪一格輸入**，如果它指得出來的話。
   *
   * 同樣以一個欄位存在，理由與上面那個相同。後端用它自己的詞彙指名
   * （例如根數），對應到畫面上的哪一格，是 proxy 的翻譯工作——
   * 後端沒有理由知道這個畫面把它畫成了「要看多長」。
   */
  readonly field: string | undefined

  constructor(
    message: string,
    options?: { cause?: unknown, status?: number, parameterName?: string, field?: string },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'BackendRequestRejectedError'
    this.status = options?.status
    this.parameterName = options?.parameterName
    this.field = options?.field
  }
}
