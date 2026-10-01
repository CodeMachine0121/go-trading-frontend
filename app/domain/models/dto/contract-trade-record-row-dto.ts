import type { TradeStatus } from '~/domain/models/vo/trade-status-vo'
import type { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'
import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'
import type { TradeTagChipVo } from '~/domain/models/vo/trade-tag-chip-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class ContractTradeRecordRowDto {
  constructor(
    public readonly id: number,
    public readonly symbol: string,
    public readonly directionLabel: LocalizedTextVo,
    public readonly directionTone: TradeBadgeTone,
    public readonly status: TradeStatus,
    public readonly statusLabel: LocalizedTextVo,
    public readonly statusTone: TradeBadgeTone,
    public readonly pendingReview: boolean,
    public readonly sourceLabel: LocalizedTextVo,
    public readonly averageEntryPriceText: string,
    public readonly averageExitPriceText: string,
    public readonly profit: TradeFigureVo,
    public readonly rMultipleText: LocalizedTextVo,
    public readonly tags: readonly TradeTagChipVo[],
  ) {}
}
