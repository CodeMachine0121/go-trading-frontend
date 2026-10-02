import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type Decimal from 'decimal.js'

export class TradeJournalSettingDto {
  constructor(
    public readonly makerFeeRate: Decimal | null,
    public readonly takerFeeRate: Decimal | null,
    public readonly configured: boolean,
    public readonly summary: LocalizedTextVo,
  ) {}

  get summaryTone(): 'success' | 'neutral' {
    return this.configured ? 'success' : 'neutral'
  }
}
