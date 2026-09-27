import type Decimal from 'decimal.js'
import type { ContractTradeDirection } from '~/domain/models/vo/contract-trade-direction-vo'
import type { ContractTradeStatus } from '~/domain/models/vo/contract-trade-status-vo'
import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'
import type { ContractTradeFillDto } from '~/domain/models/dto/contract-trade-fill-dto'
import type { TradeNoteDto } from '~/domain/models/dto/trade-note-dto'
import type { ContractTradeSourceDto } from '~/domain/models/dto/contract-trade-source-dto'
import type { TradeReviewDto } from '~/domain/models/dto/trade-review-dto'
import type { ContractTradeOutcomeDto } from '~/domain/models/dto/contract-trade-outcome-dto'
import type { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'

export class ContractTradeRecordDto {
  constructor(
    public readonly id: number,
    public readonly title: string,
    public readonly symbol: string,
    public readonly direction: ContractTradeDirection,
    public readonly directionLabel: string,
    public readonly directionTone: TradeBadgeTone,
    public readonly leverage: Decimal,
    public readonly status: ContractTradeStatus,
    public readonly statusLabel: string,
    public readonly statusTone: TradeBadgeTone,
    public readonly sourceLabel: string,
    public readonly planLocked: boolean,
    public readonly canEditFills: boolean,
    public readonly canWriteReview: boolean,
    public readonly reviewUnavailableMessage: string | null,
    public readonly plannedStopLossPrice: Decimal | null,
    public readonly plannedTakeProfitPrice: Decimal | null,
    public readonly plannedStopLossText: string,
    public readonly plannedTakeProfitText: string,
    public readonly entryReason: string,
    public readonly confidence: number | null,
    public readonly tradingStrategyId: number | null,
    public readonly openedAt: Date,
    public readonly closedAt: Date | null,
    public readonly position: Decimal,
    public readonly averageEntryPrice: Decimal,
    public readonly fills: readonly ContractTradeFillDto[],
    public readonly notes: readonly TradeNoteDto[],
    public readonly setupTags: readonly TradeTagDto[],
    public readonly mistakeTags: readonly TradeTagDto[],
    public readonly source: ContractTradeSourceDto | null,
    public readonly review: TradeReviewDto | null,
    public readonly outcome: ContractTradeOutcomeDto,
    public readonly maximumAdversePrice: Decimal | null,
    public readonly maximumFavorablePrice: Decimal | null,
    public readonly holdingDurationText: string | null,
    public readonly originLabel: string,
  ) {}
}
