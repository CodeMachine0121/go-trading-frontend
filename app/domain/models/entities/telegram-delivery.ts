/**
 * Entity：後端交出來的那一份 Telegram 投遞設定，如同它交出來的樣子。
 *
 * **結構上沒有 `botToken` 這個欄位。** 完整的金鑰在後端存進去之後就再也讀不回來，
 * 所以這一側連一個裝得下它的位置都不該有——沒有位置，就沒有人畫得出來。
 *
 * 它是乾淨的資料模型，行為在 TelegramDeliveryDomain。
 */
export class TelegramDelivery {
  constructor(
    public readonly configured: boolean,
    public readonly chatId: string,
    public readonly botTokenTail: string,
  ) {}
}
