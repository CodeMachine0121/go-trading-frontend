import type { ContractTradingMode } from '~/domain/models/vo/contract-trading-mode-vo'
import { CONTRACT_TRADING_MODES } from '~/domain/models/vo/contract-trading-mode-vo'
import { ContractTradingModeOptionDto } from '~/domain/models/dto/contract-trading-mode-option-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/** 每一種交易模式的名字與它買入、賣出各是什麼意思。多一種是在這張表加一列。 */
const CONTRACT_TRADING_MODE_DESCRIPTIONS: Readonly<
  Record<ContractTradingMode, { label: LocalizedTextVo, description: LocalizedTextVo }>
> = {
  longShort: {
    label: new LocalizedTextVo('多空反手', 'Long & short'),
    description: new LocalizedTextVo(
      '買入：空手開多、持空倉就平掉同一棒反手開多。賣出：空手開空、持多倉就平掉同一棒反手開空。',
      'Buy: open a long when flat; when short, close it and reverse into a long on the same candle. '
      + 'Sell: open a short when flat; when long, close it and reverse into a short on the same candle.'),
  },
  longOnly: {
    label: new LocalizedTextVo('只做多', 'Long only'),
    description: new LocalizedTextVo(
      '買入：空手開多。賣出：持多倉就平掉，空手時什麼都不做。',
      'Buy: open a long when flat. Sell: close the long if holding one; do nothing when flat.'),
  },
  shortOnly: {
    label: new LocalizedTextVo('只做空', 'Short only'),
    description: new LocalizedTextVo(
      '賣出：空手開空。買入：持空倉就平掉，空手時什麼都不做。',
      'Sell: open a short when flat. Buy: close the short if holding one; do nothing when flat.'),
  },
}

/** 沒有說、或說了不認得的交易模式：交易服務對留白的讀法。 */
const DEFAULT_CONTRACT_TRADING_MODE: ContractTradingMode = 'longShort'

/**
 * Domain Model：合約帳戶的一種交易模式。
 *
 * 解讀刻意寬容：真正會給出陌生字串的是後端，而讓一份交易策略因為一個沒見過的值打不開，
 * 遠比把它讀成預設的那一種糟。
 */
export class ContractTradingModeDomain {
  readonly value: ContractTradingMode

  constructor(declared: string) {
    const normalizedDeclaration = declared.trim().toLowerCase()

    this.value = CONTRACT_TRADING_MODES.find(
      candidate => candidate.toLowerCase() === normalizedDeclaration) ?? DEFAULT_CONTRACT_TRADING_MODE
  }

  label(): LocalizedTextVo {
    return CONTRACT_TRADING_MODE_DESCRIPTIONS[this.value].label
  }

  toOptionDto(): ContractTradingModeOptionDto {
    const description = CONTRACT_TRADING_MODE_DESCRIPTIONS[this.value]

    return new ContractTradingModeOptionDto(this.value, description.label, description.description)
  }
}
