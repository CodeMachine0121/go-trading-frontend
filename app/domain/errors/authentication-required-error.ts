/**
 * 哨兵錯誤：這份憑證不算數（缺席、被改過、過期，或後端已經不認得它）。
 *
 * 它**不會被顯示給使用者**——它的意思是「當作沒登入」，而沒登入的人看到的
 * 是登入畫面本身，不是一則錯誤訊息。
 */
export class AuthenticationRequiredError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'AuthenticationRequiredError'
  }
}
