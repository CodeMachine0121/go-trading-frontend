/**
 * 哨兵錯誤：這台機器人正在執行中，所以改不動。
 *
 * 畫面理應在那個狀態下就不給按編輯，所以看到這個錯誤代表畫面與後端對
 * 「它在不在跑」的看法不一致——多半是別的分頁把它啟動了。這時要說的是
 * 「它現在在跑」，不是「你填錯了」。
 */
export class StrategyBotRunningError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'StrategyBotRunningError'
  }
}
