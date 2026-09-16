/**
 * DTO：一個信號來源——一支上線的策略，加上它在這台機器人裡怎麼跑。
 *
 * **沒有 script 這一欄**，而那不是漏了。一台機器人可以指名一支從市集加入的策略，
 * 一個放不下算式的形狀，是「讀一台機器人永遠讀不到別人的算式」這件事
 * 由型別保證、而不是由每一次 code review 保證的唯一方法。
 *
 * 刻度與參數值掛在這裡而不是掛在機器人上：一台機器人用一小時的均線判方向、
 * 用五分鐘的震盪指標抓時機，是最普通的用法，而整台共用一種刻度講不出這件事。
 */
export class StrategyBotSignalSourceDto {
  constructor(
    /** 它在條件裡的名字。同一台機器人內不得重複——條件就是靠它指名的。 */
    public readonly label: string,
    public readonly strategyId: number,
    public readonly aggregationInterval: string,
    public readonly parameterValues: readonly StrategyBotParameterValueDto[],
  ) {}
}

/** DTO：一個旋鈕在這個來源裡調到多少。沒給就是用那支策略自己的預設值。 */
export class StrategyBotParameterValueDto {
  constructor(
    public readonly name: string,
    public readonly value: number,
  ) {}
}
