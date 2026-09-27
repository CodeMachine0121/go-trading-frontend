import type Decimal from 'decimal.js'
import type { ContractTradeMeasure } from '~/domain/models/entities/contract-trade-measure'

export class ContractTradeOutcome {
  constructor(
    public readonly position: Decimal,
    public readonly averageEntryPrice: Decimal,
    public readonly averageExitPrice: Decimal | null,
    public readonly grossProfit: Decimal,
    public readonly totalFee: Decimal,
    public readonly feeRateMissing: boolean,
    public readonly fundingFee: ContractTradeMeasure,
    public readonly netProfit: Decimal,
    public readonly netProfitExcludesFunding: boolean,
    public readonly plannedRisk: ContractTradeMeasure,
    public readonly rMultiple: ContractTradeMeasure,
    public readonly maximumAdverseExcursion: ContractTradeMeasure,
    public readonly maximumFavorableExcursion: ContractTradeMeasure,
    public readonly maximumAdversePrice: Decimal | null,
    public readonly maximumFavorablePrice: Decimal | null,
    public readonly profitCaptureRate: ContractTradeMeasure,
    public readonly floatingProfit: ContractTradeMeasure,
    public readonly estimatedLiquidationPrice: ContractTradeMeasure,
    public readonly entrySlippagePercentage: ContractTradeMeasure,
  ) {}
}
