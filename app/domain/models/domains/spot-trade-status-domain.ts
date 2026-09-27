import type { TradeStatus } from '~/domain/models/vo/trade-status-vo'
import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'

const STATUS_LABELS: Readonly<Record<TradeStatus, string>> = {
  open: '持有中',
  closed: '已平倉',
  reviewed: '已檢討',
}

const STATUS_TONES: Readonly<Record<TradeStatus, TradeBadgeTone>> = {
  open: 'warning',
  closed: 'neutral',
  reviewed: 'success',
}

export class SpotTradeStatusDomain {
  constructor(private readonly status: TradeStatus) {}

  get label(): string {
    return STATUS_LABELS[this.status]
  }

  get tone(): TradeBadgeTone {
    return STATUS_TONES[this.status]
  }

  get isOpen(): boolean {
    return this.status === 'open'
  }

  get awaitsReview(): boolean {
    return this.status === 'closed'
  }
}
