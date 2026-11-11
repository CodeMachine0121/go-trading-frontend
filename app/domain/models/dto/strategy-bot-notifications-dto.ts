/**
 * DTO：一台機器人三種結論各自要不要通知擁有者。
 *
 * 預設（買入開、賣出開、持有關）是交易服務對一台沒說的機器人的讀法，
 * 與「升級前每台機器人怎麼做」一字不差：持有本來就不通知。
 */
export class StrategyBotNotificationsDto {
  constructor(
    /** 結論是買入時寄輪次訊息。關掉只是不寄，自動下單與紀錄照常。 */
    public readonly buy: boolean = true,
    /** 結論是賣出時寄輪次訊息。 */
    public readonly sell: boolean = true,
    /** 回到持有時寄一次；連續的持有不重複。 */
    public readonly hold: boolean = false,
  ) {}
}
