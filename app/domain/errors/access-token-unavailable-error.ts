/**
 * 哨兵錯誤：後端目前簽不出任何憑證（它沒有設定簽章鑰匙）。
 *
 * 這一種必須跟「帳密不正確」分開，因為使用者改什麼都沒用——他的密碼是對的。
 * 把它說成帳密錯，會讓人在一組本來就正確的密碼上重打一個小時。
 */
export class AccessTokenUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'AccessTokenUnavailableError'
  }
}
