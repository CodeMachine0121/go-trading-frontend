/**
 * 哨兵錯誤：後端自己出了問題（例如讀不到資料庫），不是使用者的輸入有問題。
 *
 * 與 BackendRequestRejectedError 分開，是因為使用者的下一步不同：
 * 那個要改輸入，這個改什麼都沒用，只能稍後重試。
 * 把後端的故障說成「請求的問題」，會讓使用者一直修一份從來沒錯的請求。
 */
export class BackendServerError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'BackendServerError'
  }
}
