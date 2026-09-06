/**
 * DTO：回測的一條規則——標題加一句說明。
 *
 * 這些字住在 domain 而不是那個對話框裡，與「算式裡可以用什麼」同一個理由：
 * 它們描述的是系統真正的行為。散在畫面上的話，行為改了沒有人會知道要回頭改它們。
 */
export class BacktestRuleDto {
  constructor(
    public readonly title: string,
    public readonly description: string,
  ) {}
}
