import type { TradeStatus } from '~/domain/models/vo/trade-status-vo'
import type { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'
import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'
import type { TradeTagChipVo } from '~/domain/models/vo/trade-tag-chip-vo'

export class ContractTradeRecordRowDto {
  constructor(
    public readonly id: number,
    public readonly symbol: string,
    public readonly directionLabel: string,
    public readonly directionTone: TradeBadgeTone,
    public readonly status: TradeStatus,
    public readonly statusLabel: string,
    public readonly statusTone: TradeBadgeTone,
    public readonly pendingReview: boolean,
    public readonly sourceLabel: string,
    public readonly averageEntryPriceText: string,
    public readonly averageExitPriceText: string,
    public readonly profit: TradeFigureVo,
    public readonly rMultipleText: string,
    public readonly tags: readonly TradeTagChipVo[],
  ) {}
}
