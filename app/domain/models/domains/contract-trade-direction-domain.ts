import type Decimal from 'decimal.js'
import type { ContractTradeDirection } from '~/domain/models/vo/contract-trade-direction-vo'
import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const DIRECTION_WORDS: Readonly<Record<ContractTradeDirection, LocalizedTextVo>> = {
  long: new LocalizedTextVo('做多', 'Long'),
  short: new LocalizedTextVo('做空', 'Short'),
}

export class ContractTradeDirectionDomain {
  constructor(
    private readonly direction: ContractTradeDirection,
    private readonly leverage: Decimal,
  ) {}

  get word(): LocalizedTextVo {
    return DIRECTION_WORDS[this.direction]
  }

  get label(): LocalizedTextVo {
    return new LocalizedTextVo(
      `${this.word.traditionalChinese} ${this.leverage.toFixed()} 倍`,
      `${this.word.english} ${this.leverage.toFixed()}x`)
  }

  get tone(): TradeBadgeTone {
    return this.direction === 'long' ? 'success' : 'danger'
  }
}
