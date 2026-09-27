import type Decimal from 'decimal.js'
import type { SpotTradeMarket } from '~/domain/models/vo/spot-trade-market-vo'
import type { SpotTradeFillKind } from '~/domain/models/vo/spot-trade-fill-kind-vo'
import type { SpotTradePrefillMode } from '~/domain/models/vo/spot-trade-prefill-mode-vo'

export class SpotTradePrefill {
  constructor(
    public readonly journalLinkIdentifier: string,
    public readonly mode: SpotTradePrefillMode,
    public readonly targetTradeId: number | null,
    public readonly strategyBotName: string,
    public readonly runNumber: number,
    public readonly ranAt: Date,
    public readonly signal: SpotTradeFillKind,
    public readonly symbol: string,
    public readonly market: SpotTradeMarket,
    public readonly referencePrice: Decimal | null,
    public readonly quantity: Decimal | null,
    public readonly plannedStopLossPrice: Decimal | null,
    public readonly plannedTakeProfitPrice: Decimal | null,
    public readonly tradingStrategyId: number | null,
  ) {}
}
