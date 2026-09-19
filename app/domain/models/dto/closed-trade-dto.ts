import type { ProfitTone } from '~/domain/models/vo/profit-tone-vo'

/**
 * DTO：交易明細裡的一列，已經可以直接畫。
 *
 * 時間仍然是 `Date`：它要照使用者選的顯示時區寫出來，而那是這一頁共用的一件事，
 * 不是這一列自己的。價格與賺賠已經是字串——它們是金額，畫面不該再算它們。
 */
export class ClosedTradeDto {
  constructor(
    public readonly directionLabel: string,
    public readonly entryTime: Date,
    public readonly entryPrice: string,
    public readonly exitTime: Date,
    public readonly exitPrice: string,
    /** 已經是扣掉下面那兩筆成本之後的淨額。 */
    public readonly profit: string,
    public readonly profitTone: ProfitTone,
    /** 這一筆怎麼出場的，已經是中文：訊號／止損／止盈。 */
    public readonly exitReasonLabel: string,
    /** 這一筆兩端各付掉多少。沒收過錢的那一次重演裡它們都是 `'0.00'`。 */
    public readonly entryCost: string,
    public readonly exitCost: string,
  ) {}
}
