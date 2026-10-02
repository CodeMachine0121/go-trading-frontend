import type { TradeStatus } from '~/domain/models/vo/trade-status-vo'
import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'
import type { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'
import type { TradeTagChipVo } from '~/domain/models/vo/trade-tag-chip-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class SpotTradeRecordRowDto {
  constructor(
    public readonly id: number,
    public readonly symbol: string,
    public readonly marketLabel: LocalizedTextVo,
    public readonly status: TradeStatus,
    public readonly statusLabel: LocalizedTextVo,
    public readonly statusTone: TradeBadgeTone,
    public readonly pendingReview: boolean,
    public readonly sourceLabel: LocalizedTextVo,
    public readonly averageBuyPriceText: string,
    public readonly averageSellPriceText: string,
    public readonly profit: TradeFigureVo,
    public readonly returnRate: TradeFigureVo,
    public readonly tags: readonly TradeTagChipVo[],
  ) {}
}
