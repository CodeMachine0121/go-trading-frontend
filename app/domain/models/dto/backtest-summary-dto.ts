import type { ProfitTone } from '~/domain/models/vo/profit-tone-vo'
import type { ContractBacktestSummaryDto } from '~/domain/models/dto/contract-backtest-summary-dto'
import type { BacktestTradeStatisticsDto } from '~/domain/models/dto/backtest-trade-statistics-dto'

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
    /**
     * 實際開成幾個倉。**一律顯示**，與交易次數並排。
     *
     * 它與下面那幾格「有才出現」的數字刻意不同：那幾格只在特定玩法下才有意義
     * （沒模擬出場時止損筆數恆為零），而這一個與交易次數同一個層級，
     * **等於零本身就是資訊**。
     *
     * 兩者不相等就代表現在還抱著一注——而那正是一張空明細唯一說得通的另一種原因。
     */
    public readonly positionOpenCount: number,
    /** 已平倉的筆數。還開著的那一注不算，所以它可能小於開倉次數。 */
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
    /**
     * 結束時手上還有一個沒平掉的倉。
     *
     * 它由領域算好（開倉次數大於交易次數，因為同一時間最多一個部位），
     * 而不是讓畫面把兩個數字相減——那條推論靠的是一條領域規則，
     * 元件一旦開始推論，那條規則就有了第二個住處。
     *
     * 它決定交易明細的空狀態要說哪一句話。
     */
    public readonly hasOpenPosition: boolean,
    /** 合約重演多出的那幾格；現貨重演是 `null`，成績單上就沒有那一段。 */
    public readonly contract: ContractBacktestSummaryDto | null = null,
    /** 只算已平倉交易的五格。 */
    public readonly tradeStatistics: BacktestTradeStatisticsDto | null = null,
    /** 這一次的成交時點，例如「下一格開盤成交」。 */
    public readonly fillTimingLabel: string | null = null,
  ) {}
}
