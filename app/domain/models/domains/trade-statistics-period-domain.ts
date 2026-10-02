import type { TradeStatisticsPeriod } from '~/domain/models/vo/trade-statistics-period-vo'
import { JournalOptionDto } from '~/domain/models/dto/journal-option-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const PERIOD_LABELS: Readonly<Record<TradeStatisticsPeriod, LocalizedTextVo>> = {
  '7d': new LocalizedTextVo('最近 7 天', 'Last 7 days'),
  '30d': new LocalizedTextVo('最近 30 天', 'Last 30 days'),
  '90d': new LocalizedTextVo('最近 90 天', 'Last 90 days'),
  'all': new LocalizedTextVo('全部期間', 'All time'),
}

export class TradeStatisticsPeriodDomain {
  constructor(private readonly period: TradeStatisticsPeriod) {}

  get label(): LocalizedTextVo {
    return PERIOD_LABELS[this.period]
  }

  toOptionDto(): JournalOptionDto {
    return new JournalOptionDto(this.period, this.label)
  }
}
