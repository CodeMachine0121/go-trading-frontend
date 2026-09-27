import type Decimal from 'decimal.js'
import type { TradeMeasure } from '~/domain/models/entities/trade-measure'

export class SpotTradeOutcome {
  constructor(
    public readonly holding: Decimal,
    public readonly boughtQuantity: Decimal,
    public readonly averageBuyPrice: Decimal,
    public readonly averageSellPrice: Decimal | null,
    public readonly grossProfit: Decimal,
    public readonly totalFee: Decimal,
    public readonly netProfit: Decimal,
    public readonly buyCost: Decimal,
    public readonly returnRate: TradeMeasure,
    public readonly plannedRisk: TradeMeasure,
    public readonly rMultiple: TradeMeasure,
    public readonly maximumAdverseExcursion: TradeMeasure,
    public readonly maximumFavorableExcursion: TradeMeasure,
    public readonly maximumAdversePrice: Decimal | null,
    public readonly maximumFavorablePrice: Decimal | null,
    public readonly profitCaptureRate: TradeMeasure,
    public readonly floatingProfit: TradeMeasure,
    public readonly entrySlippagePercentage: TradeMeasure,
  ) {}
}
