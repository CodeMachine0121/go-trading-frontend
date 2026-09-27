import type { TradeStatisticsPeriod } from '~/domain/models/vo/trade-statistics-period-vo'
import { JournalOptionDto } from '~/domain/models/dto/journal-option-dto'

const PERIOD_LABELS: Readonly<Record<TradeStatisticsPeriod, string>> = {
  '7d': '最近 7 天',
  '30d': '最近 30 天',
  '90d': '最近 90 天',
  'all': '全部期間',
}

export class TradeStatisticsPeriodDomain {
  constructor(private readonly period: TradeStatisticsPeriod) {}

  get label(): string {
    return PERIOD_LABELS[this.period]
  }

  toOptionDto(): JournalOptionDto {
    return new JournalOptionDto(this.period, this.label)
  }
}
