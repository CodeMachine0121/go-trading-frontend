import type Decimal from 'decimal.js'
import type { SpotTradeMarket } from '~/domain/models/vo/spot-trade-market-vo'
import type { TradeStatus } from '~/domain/models/vo/trade-status-vo'
import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'
import type { SpotTradeFillDto } from '~/domain/models/dto/spot-trade-fill-dto'
import type { TradeNoteDto } from '~/domain/models/dto/trade-note-dto'
import type { TradeSourceDto } from '~/domain/models/dto/trade-source-dto'
import type { TradeReviewDto } from '~/domain/models/dto/trade-review-dto'
import type { TradeOutcomeDto } from '~/domain/models/dto/trade-outcome-dto'
import type { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class SpotTradeRecordDto {
  constructor(
    public readonly id: number,
    public readonly title: string,
    public readonly symbol: string,
    public readonly market: SpotTradeMarket,
    public readonly marketLabel: LocalizedTextVo,
    public readonly currency: string,
    public readonly wholeSharesOnly: boolean,
    public readonly status: TradeStatus,
    public readonly statusLabel: LocalizedTextVo,
    public readonly statusTone: TradeBadgeTone,
    public readonly planLocked: boolean,
    public readonly canEditFills: boolean,
    public readonly canWriteReview: boolean,
    public readonly reviewUnavailableMessage: LocalizedTextVo | null,
    public readonly plannedStopLossPrice: Decimal | null,
    public readonly plannedTakeProfitPrice: Decimal | null,
    public readonly plannedStopLossText: LocalizedTextVo,
    public readonly plannedTakeProfitText: LocalizedTextVo,
    public readonly entryReason: string,
    public readonly confidence: number | null,
    public readonly tradingStrategyId: number | null,
    public readonly openedAt: Date,
    public readonly closedAt: Date | null,
    public readonly holding: Decimal,
    public readonly holdingText: LocalizedTextVo,
    public readonly averageBuyPrice: Decimal,
    public readonly fills: readonly SpotTradeFillDto[],
    public readonly notes: readonly TradeNoteDto[],
    public readonly setupTags: readonly TradeTagDto[],
    public readonly mistakeTags: readonly TradeTagDto[],
    public readonly source: TradeSourceDto | null,
    public readonly review: TradeReviewDto | null,
    public readonly outcome: TradeOutcomeDto,
    public readonly maximumAdversePrice: Decimal | null,
    public readonly maximumFavorablePrice: Decimal | null,
    public readonly holdingDurationText: LocalizedTextVo | null,
    public readonly originLabel: LocalizedTextVo,
  ) {}
}
