/**
 * DTO：要存進去的那一份 Telegram 投遞設定。
 *
 * 它是這一側唯一裝得下一整串機器人金鑰的形狀，而且只往一個方向走——出去。
 * 沒有任何東西把它轉回來。
 */
export class TelegramDeliveryWriteDto {
  constructor(
    public readonly botToken: string,
    public readonly chatId: string,
  ) {}
}
