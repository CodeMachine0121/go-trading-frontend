import type { ContractTradingMode } from '~/domain/models/vo/contract-trading-mode-vo'
import { CONTRACT_TRADING_MODES } from '~/domain/models/vo/contract-trading-mode-vo'
import { ContractTradingModeOptionDto } from '~/domain/models/dto/contract-trading-mode-option-dto'

/** 每一種交易模式的名字與它買入、賣出各是什麼意思。多一種是在這張表加一列。 */
const CONTRACT_TRADING_MODE_DESCRIPTIONS: Readonly<
  Record<ContractTradingMode, { label: string, description: string }>
> = {
  longShort: {
    label: '多空反手',
    description: '買入：空手開多、持空倉就平掉同一棒反手開多。賣出：空手開空、持多倉就平掉同一棒反手開空。',
  },
  longOnly: {
    label: '只做多',
    description: '買入：空手開多。賣出：持多倉就平掉，空手時什麼都不做。',
  },
  shortOnly: {
    label: '只做空',
    description: '賣出：空手開空。買入：持空倉就平掉，空手時什麼都不做。',
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

  label(): string {
    return CONTRACT_TRADING_MODE_DESCRIPTIONS[this.value].label
  }

  toOptionDto(): ContractTradingModeOptionDto {
    const description = CONTRACT_TRADING_MODE_DESCRIPTIONS[this.value]

    return new ContractTradingModeOptionDto(this.value, description.label, description.description)
  }
}
