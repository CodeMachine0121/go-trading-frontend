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
    /**
     * 兩邊條件同時成立的棒數，**零的時候不顯示**——一支策略腳本的成績單上
     * 多一個永遠是零的格子，只會讓人以為它有什麼意思。
     */
    public readonly conflictedCandleCount: number,
    /**
     * 被止損掃出場、被止盈帶走的筆數，**兩者都是零時不顯示**——
     * 與打架棒數同一條規則：一格永遠是零的數字只會讓人以為它有什麼意思。
     *
     * 「我設了停損但它一次都沒被碰到」這件事不由這兩格說，
     * 而是交易明細那一欄說（每一列都寫著「訊號」）。
     */
    public readonly stopLossExitCount: number,
    public readonly takeProfitExitCount: number,
    /**
     * 這次總共為了交易付掉多少，**沒收過錢時是 `null`**。
     *
     * `null` 而不是 `'0.00'`，因為到了這裡它已經是一個字串——而字串沒有
     * 「大於零」這回事，元件沒辦法照上面那幾格的做法自己判斷。
     * 要不要顯示是領域知識，不是樣式，所以那個決定留在領域模型裡，
     * 與勝率那一格「一筆都沒平倉時是不適用」是同一個先例。
     */
    public readonly totalTransactionCost: string | null,
  ) {}
}
