/**
 * 哨兵錯誤：後端說「目前的密碼」那一格填的不是目前的密碼。
 *
 * 它是一個**型別**而不是一句訊息，因為畫面要據它把說明掛回那一格——而它必須與
 * 「請重新登入」分得開：後端刻意用 403 而不是 401 說這件事，正是因為這個人的登入
 * 好得很，把他帶回登入畫面是最不該做的事。
 */
export class CurrentPasswordRejectedError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'CurrentPasswordRejectedError'
  }
}
