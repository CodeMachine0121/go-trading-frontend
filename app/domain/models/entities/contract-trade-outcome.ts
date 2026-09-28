import type Decimal from 'decimal.js'
import type { TradeMeasure } from '~/domain/models/entities/trade-measure'

export class ContractTradeOutcome {
  constructor(
    public readonly position: Decimal,
    public readonly averageEntryPrice: Decimal,
    public readonly averageExitPrice: Decimal | null,
    public readonly grossProfit: Decimal,
    public readonly totalFee: Decimal,
    public readonly feeRateMissing: boolean,
    public readonly fundingFee: TradeMeasure,
    public readonly netProfit: Decimal,
    public readonly netProfitExcludesFunding: boolean,
    public readonly plannedRisk: TradeMeasure,
    public readonly rMultiple: TradeMeasure,
    public readonly maximumAdverseExcursion: TradeMeasure,
    public readonly maximumFavorableExcursion: TradeMeasure,
    public readonly maximumAdversePrice: Decimal | null,
    public readonly maximumFavorablePrice: Decimal | null,
    public readonly profitCaptureRate: TradeMeasure,
    public readonly floatingProfit: TradeMeasure,
    public readonly estimatedLiquidationPrice: TradeMeasure,
    public readonly entrySlippagePercentage: TradeMeasure,
    public readonly entryNotional: TradeMeasure,
    public readonly entryMargin: TradeMeasure,
    public readonly returnOnMarginPercentage: TradeMeasure,
    public readonly implausibleFeeFillIds: readonly number[],
  ) {}
}
