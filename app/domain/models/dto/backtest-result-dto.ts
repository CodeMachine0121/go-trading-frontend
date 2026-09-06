import type { BacktestSummaryDto } from '~/domain/models/dto/backtest-summary-dto'
import type { ClosedTradeDto } from '~/domain/models/dto/closed-trade-dto'
import type { EquityPointDto } from '~/domain/models/dto/equity-point-dto'

/**
 * DTO：一次回測的結果形狀，也是畫面拿得到的唯一形狀。
 *
 * 它說出這次**實際**重演了哪一段：要求的區間與真正重演的那一段會不一樣，
 * 因為結尾那個還沒走完的刻度區間不算。畫面要說「這條線畫的是哪一段」，
 * 靠的是這裡，不是使用者填了什麼。
 */
export class BacktestResultDto {
  constructor(
    public readonly symbol: string,
    /** 這次**實際**採用的彙總刻度，已經是給人看的名字。 */
    public readonly intervalLabel: string,
    public readonly startTime: Date,
    public readonly endTime: Date,
    public readonly usedCandleCount: number,
    public readonly summary: BacktestSummaryDto,
    public readonly closedTrades: readonly ClosedTradeDto[],
    public readonly equityCurve: readonly EquityPointDto[],
  ) {}

  /**
   * 這段期間一筆交易都沒有觸發。
   *
   * 它是一個問句而不是讓畫面自己數長度，因為畫面接下來要做的不是「不畫表格」，
   * 而是**明講這件事**——空白會讓人以為壞了。有一個名字，那句話才有地方掛。
   */
  get hasNoTrades(): boolean {
    return this.closedTrades.length === 0
  }
}
