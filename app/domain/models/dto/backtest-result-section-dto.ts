import type { BacktestSummaryDto } from '~/domain/models/dto/backtest-summary-dto'
import type { ClosedTradeDto } from '~/domain/models/dto/closed-trade-dto'
import type { EquityPointDto } from '~/domain/models/dto/equity-point-dto'

/** 結果的哪一塊：整段、驗證段、調參段。 */
export type BacktestResultSectionKind = 'whole' | 'validation' | 'inSample'

/**
 * DTO：結果畫面上的一塊——它叫什麼、要說什麼、要不要醒目，以及它自己的成績單、曲線與明細。
 *
 * 畫成哪幾塊、依什麼順序、哪一塊醒目是領域的決定，所以整串由 domain 排好交出來，
 * 元件只照著一塊一塊畫。
 */
export class BacktestResultSectionDto {
  constructor(
    public readonly kind: BacktestResultSectionKind,
    /** 沒有切分時只有一塊，它沒有標題。 */
    public readonly title: string | null,
    public readonly note: string | null,
    public readonly emphasized: boolean,
    public readonly startTime: Date,
    public readonly endTime: Date,
    public readonly usedCandleCount: number,
    public readonly intervalLabel: string,
    public readonly summary: BacktestSummaryDto,
    public readonly closedTrades: readonly ClosedTradeDto[],
    /** 取樣過、拿來畫的那一條；成績單的數字不看它。 */
    public readonly chartEquityCurve: readonly EquityPointDto[],
  ) {}
}
