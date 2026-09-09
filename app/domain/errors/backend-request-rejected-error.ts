import type { CandleCoverageShortfallVo } from '~/domain/models/vo/candle-coverage-shortfall-vo'

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

  /**
   * 這次拒絕是因為走完的刻度區間**連一個值都湊不出來**時，系統交出來的那兩個根數。
   *
   * 同樣以值存在，理由與上面兩個相同。它以**一個**值物件掛在這裡而不是兩個欄位：
   * 那兩個數字一起才說得出那句話，而分成兩個參數會讓這個建構選項每次需求都變長。
   */
  readonly candleCoverageShortfall: CandleCoverageShortfallVo | undefined

  /**
   * 這次拒絕是因為**要看的那一段裡，那個市場根本沒有開過**。
   *
   * 同樣以一個值存在，理由與上面三個相同。它是布林而不是一組數字，因為這一種說得完的
   * 只有「是這一種」——沒有任何一個數字調一調就會讓週六長出成交。
   */
  readonly marketClosedThroughout: boolean

  constructor(
    message: string,
    options?: {
      cause?: unknown
      status?: number
      parameterName?: string
      field?: string
      candleCoverageShortfall?: CandleCoverageShortfallVo
      marketClosedThroughout?: boolean
    },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'BackendRequestRejectedError'
    this.status = options?.status
    this.parameterName = options?.parameterName
    this.field = options?.field
    this.candleCoverageShortfall = options?.candleCoverageShortfall
    this.marketClosedThroughout = options?.marketClosedThroughout ?? false
  }
}
