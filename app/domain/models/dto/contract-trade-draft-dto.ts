import type Decimal from 'decimal.js'
import type { ContractTradeDirection } from '~/domain/models/vo/contract-trade-direction-vo'
import type { ContractTradeDraftFillDto } from '~/domain/models/dto/contract-trade-draft-fill-dto'

export class ContractTradeDraftDto {
  constructor(
    public readonly symbol: string,
    public readonly direction: ContractTradeDirection,
    public readonly leverageText: string,
    public readonly fills: readonly ContractTradeDraftFillDto[],
    public readonly plannedStopLossText: string,
    public readonly plannedTakeProfitText: string,
    public readonly entryReason: string,
    public readonly confidence: number | null,
    public readonly tradingStrategyId: number | null,
    public readonly setupTagIds: readonly number[],
    public readonly journalLinkIdentifier: string | null,
    public readonly referencePrice: Decimal | null = null,
  ) {}
}
