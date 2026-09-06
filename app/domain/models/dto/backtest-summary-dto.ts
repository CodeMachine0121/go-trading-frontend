import type { ProfitTone } from '~/domain/models/vo/profit-tone-vo'

/**
 * DTO：一次回測的成績單，**已經可以直接畫**。
 *
 * 每一個數字都是字串而不是數字，色調也已經決定好了。畫面因此不必知道
 * 該進位到第幾位、零算不算賺、一筆都沒平倉時該說什麼——那三件都是規則。
 */
export class BacktestSummaryDto {
  constructor(
    public readonly initialCapital: string,
    public readonly finalEquity: string,
    /** 例如 `'+25.00%'`。正負號一律寫出來——掃過去時符號比數字先被看見。 */
    public readonly totalReturnRate: string,
    public readonly totalReturnTone: ProfitTone,
    /** 回撤永遠是壞消息，所以它不帶色調——標成紅的只是重覆說了一次它是什麼。 */
    public readonly maximumDrawdown: string,
    /** 一筆都沒平倉時是「不適用」，不是 `'0%'`。 */
    public readonly winRate: string,
    public readonly tradeCount: number,
  ) {}
}
