/**
 * 哨兵錯誤：這份表單在送出去之前就被擋下來了。
 *
 * 它與後端回來的拒絕分開，是因為它保證了一件事：**這一次沒有送出任何東西**。
 * 畫面因此可以放心把表單原封不動留著，不必擔心伺服器那邊已經改了一半。
 */
export class StrategyBotRejectedError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'StrategyBotRejectedError'
  }
}
