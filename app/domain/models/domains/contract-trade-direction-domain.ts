import type Decimal from 'decimal.js'
import type { ContractTradeDirection } from '~/domain/models/vo/contract-trade-direction-vo'
import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'

const DIRECTION_WORDS: Readonly<Record<ContractTradeDirection, string>> = {
  long: '做多',
  short: '做空',
}

export class ContractTradeDirectionDomain {
  constructor(
    private readonly direction: ContractTradeDirection,
    private readonly leverage: Decimal,
  ) {}

  get word(): string {
    return DIRECTION_WORDS[this.direction]
  }

  get label(): string {
    return `${this.word} ${this.leverage.toFixed()} 倍`
  }

  get tone(): TradeBadgeTone {
    return this.direction === 'long' ? 'success' : 'danger'
  }
}
