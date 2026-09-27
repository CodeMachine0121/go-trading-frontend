import type { TradeStatus } from '~/domain/models/vo/trade-status-vo'
import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'
import type { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'
import type { TradeTagChipVo } from '~/domain/models/vo/trade-tag-chip-vo'

export class SpotTradeRecordRowDto {
  constructor(
    public readonly id: number,
    public readonly symbol: string,
    public readonly marketLabel: string,
    public readonly status: TradeStatus,
    public readonly statusLabel: string,
    public readonly statusTone: TradeBadgeTone,
    public readonly pendingReview: boolean,
    public readonly sourceLabel: string,
    public readonly averageBuyPriceText: string,
    public readonly averageSellPriceText: string,
    public readonly profit: TradeFigureVo,
    public readonly returnRate: TradeFigureVo,
    public readonly tags: readonly TradeTagChipVo[],
  ) {}
}
