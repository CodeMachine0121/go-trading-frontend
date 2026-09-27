import type Decimal from 'decimal.js'
import type { ContractTradeDirection } from '~/domain/models/vo/contract-trade-direction-vo'
import type { ContractTradePrefillMode } from '~/domain/models/vo/contract-trade-prefill-mode-vo'
import type { ContractTradeBadgeTone } from '~/domain/models/vo/contract-trade-badge-tone-vo'

export class ContractTradePrefillDto {
  constructor(
    public readonly journalLinkIdentifier: string,
    public readonly mode: ContractTradePrefillMode,
    public readonly targetTradeId: number | null,
    public readonly targetPath: string | null,
    public readonly sourceLabel: string,
    public readonly ranAt: Date,
    public readonly referencePriceText: string | null,
    public readonly notice: string | null,
    public readonly symbol: string,
    public readonly direction: ContractTradeDirection,
    public readonly leverage: Decimal,
    public readonly plannedStopLossPrice: Decimal | null,
    public readonly plannedTakeProfitPrice: Decimal | null,
    public readonly tradingStrategyId: number | null,
    public readonly entryPrice: Decimal | null,
    public readonly quantity: Decimal | null,
    public readonly directionLabel: string,
    public readonly directionTone: ContractTradeBadgeTone,
  ) {}
}
