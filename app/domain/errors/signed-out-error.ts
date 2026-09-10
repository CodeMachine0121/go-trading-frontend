/**
 * 哨兵錯誤：這一次請求沒有帶著有效的身分——沒帶、被改過、過期，或它指向的人已經不在。
 *
 * 它與其他每一種失敗分開，因為使用者要做的事完全不同：其他失敗是改自己送出去的東西，
 * 這一種改什麼都沒用，只能重新登入。把它顯示成一般的紅字，人會盯著一段沒有問題的算式看很久。
 *
 * 四種情況共用這一個型別，是因為它們對持有者是同一件事。訊息由後端說，這裡照抄——
 * 畫面不自己發明第二句話。
 */
export class SignedOutError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause })
    this.name = 'SignedOutError'
  }
}
