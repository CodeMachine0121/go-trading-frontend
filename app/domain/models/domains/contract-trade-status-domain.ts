import type { TradeStatus } from '~/domain/models/vo/trade-status-vo'
import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const STATUS_LABELS: Readonly<Record<TradeStatus, LocalizedTextVo>> = {
  open: new LocalizedTextVo('持倉中', 'Open'),
  closed: new LocalizedTextVo('已平倉', 'Closed'),
  reviewed: new LocalizedTextVo('已檢討', 'Reviewed'),
}

const STATUS_TONES: Readonly<Record<TradeStatus, TradeBadgeTone>> = {
  open: 'warning',
  closed: 'neutral',
  reviewed: 'success',
}

export class ContractTradeStatusDomain {
  constructor(private readonly status: TradeStatus) {}

  get label(): LocalizedTextVo {
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
