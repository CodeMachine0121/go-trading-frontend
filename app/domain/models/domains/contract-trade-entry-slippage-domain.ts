import type Decimal from 'decimal.js'
import type { ContractTradeDirection } from '~/domain/models/vo/contract-trade-direction-vo'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'

const PERCENT = 100
const FRACTION_DIGITS = 2

export class ContractTradeEntrySlippageDomain {
  constructor(
    private readonly direction: ContractTradeDirection,
    private readonly averageEntryPrice: Decimal,
    private readonly referencePrice: Decimal,
  ) {}

  get text(): string {
    const comparison = this.averageEntryPrice.greaterThanOrEqualTo(this.referencePrice) ? '高' : '低'
    const percentage = new JournalNumberDomain(
      this.averageEntryPrice.minus(this.referencePrice).abs().dividedBy(this.referencePrice).times(PERCENT),
    ).percentage(FRACTION_DIGITS)
    const unfavorable = this.direction === 'long'
      ? this.averageEntryPrice.greaterThan(this.referencePrice)
      : this.averageEntryPrice.lessThan(this.referencePrice)

    return `比參考價${comparison} ${percentage}${unfavorable ? '（滑點）' : ''}`
  }
}
