import type { ProfitTone } from '~/domain/models/vo/profit-tone-vo'

/**
 * DTO：成績單的合約那幾格，**已經可以直接畫**。
 *
 * 只在合約重演出現；現貨重演的成績單沒有這一段。
 */
export class ContractBacktestSummaryDto {
  constructor(
    public readonly tradingModeLabel: string,
    /** 例如 `'5 倍'`。 */
    public readonly leverageLabel: string,
    public readonly liquidationExitCount: number,
    /** 例如 `'付出 18.00'`、`'收到 5.00'`；沒有收付時是 `'0.00'`。 */
    public readonly totalFundingFee: string,
    /** 付出是壞消息、收到是好消息。 */
    public readonly totalFundingFeeTone: ProfitTone,
    public readonly longTradeCount: number,
    /** 一筆多單都沒有時是「不適用」。 */
    public readonly longWinRate: string,
    public readonly shortTradeCount: number,
    public readonly shortWinRate: string,
    /** 零也照寫——那正是「交易所讓不讓他下這張單」的答案。 */
    public readonly blockedOpeningCount: number,
    /** 「完整分級」或「最小那一級」。 */
    public readonly maintenanceMarginBasisLabel: string,
    /** 那個依據的代價，一句話。 */
    public readonly maintenanceMarginBasisNote: string,
    /** 完整分級的確認時間，要照使用者選的時區寫；最小那一級是 `null`。 */
    public readonly maintenanceMarginConfirmedAt: Date | null,
  ) {}
}
