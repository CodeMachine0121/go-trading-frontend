import type { ContractTradeStatus } from '~/domain/models/vo/contract-trade-status-vo'
import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'

const STATUS_LABELS: Readonly<Record<ContractTradeStatus, string>> = {
  open: '持倉中',
  closed: '已平倉',
  reviewed: '已檢討',
}

const STATUS_TONES: Readonly<Record<ContractTradeStatus, TradeBadgeTone>> = {
  open: 'warning',
  closed: 'neutral',
  reviewed: 'success',
}

export class ContractTradeStatusDomain {
  constructor(private readonly status: ContractTradeStatus) {}

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
