/**
 * DTO：這台操作台看得到的 Telegram 投遞設定。
 *
 * **沒有放完整金鑰的位置**，與後端交出來的形狀一模一樣，理由也一樣：
 * 一個裝得下它的欄位，遲早會有人把它畫到畫面上。這裡看得到的只夠認出
 * 「是不是我貼的那一組」。
 *
 * `configured` 為 false 時另外兩個是空的。還沒設定過是一個**正常狀態**，
 * 不是錯誤——畫面據它畫空狀態，而不是畫紅字。
 */
export class TelegramDeliveryDto {
  constructor(
    public readonly configured: boolean,
    public readonly chatId: string,
    public readonly botTokenTail: string,
    /** 已設定時它是一句「已設定，結尾 1234」；還沒設定時是 null。 */
    public readonly summary: string | null,
  ) {}
}
