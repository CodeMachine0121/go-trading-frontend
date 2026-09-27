import type Decimal from 'decimal.js'
import type { ContractTradeDirection } from '~/domain/models/vo/contract-trade-direction-vo'
import type { ContractTradePrefillMode } from '~/domain/models/vo/contract-trade-prefill-mode-vo'

export class ContractTradePrefill {
  constructor(
    public readonly journalLinkIdentifier: string,
    public readonly mode: ContractTradePrefillMode,
    public readonly targetTradeId: number | null,
    public readonly strategyBotName: string,
    public readonly runNumber: number,
    public readonly ranAt: Date,
    public readonly symbol: string,
    public readonly direction: ContractTradeDirection,
    public readonly leverage: Decimal,
    public readonly plannedStopLossPrice: Decimal | null,
    public readonly plannedTakeProfitPrice: Decimal | null,
    public readonly tradingStrategyId: number | null,
    public readonly tradingStrategyName: string | null,
    public readonly referencePrice: Decimal | null,
    public readonly suggestedQuantity: Decimal | null,
  ) {}
}
