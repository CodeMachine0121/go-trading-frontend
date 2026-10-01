import type Decimal from 'decimal.js'
import type { ContractTradeDirection } from '~/domain/models/vo/contract-trade-direction-vo'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const PERCENT = 100
const FRACTION_DIGITS = 2

export class ContractTradeEntrySlippageDomain {
  constructor(
    private readonly direction: ContractTradeDirection,
    private readonly averageEntryPrice: Decimal,
    private readonly referencePrice: Decimal,
  ) {}

  get text(): LocalizedTextVo {
    const above = this.averageEntryPrice.greaterThanOrEqualTo(this.referencePrice)
    const percentage = new JournalNumberDomain(
      this.averageEntryPrice.minus(this.referencePrice).abs().dividedBy(this.referencePrice).times(PERCENT),
    ).percentage(FRACTION_DIGITS)
    const unfavorable = this.direction === 'long'
      ? this.averageEntryPrice.greaterThan(this.referencePrice)
      : this.averageEntryPrice.lessThan(this.referencePrice)

    return new LocalizedTextVo(
      `比參考價${above ? '高' : '低'} ${percentage}${unfavorable ? '（滑點）' : ''}`,
      `${percentage} ${above ? 'above' : 'below'} the reference price${unfavorable ? ' (slippage)' : ''}`)
  }
}
