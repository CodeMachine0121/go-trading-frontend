import { ContractTradingModeDomain } from '~/domain/models/domains/contract-trading-mode-domain'
import type { ContractTradingMode } from '~/domain/models/vo/contract-trading-mode-vo'
import type { TradingDirection } from '~/domain/models/vo/trading-direction-vo'
import { TRADING_DIRECTIONS } from '~/domain/models/vo/trading-direction-vo'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/** 一台合約機器人沒說交易方向時：兩個都選，也就是多空反手——與交易服務的讀法一致。 */
export const STRATEGY_BOT_DEFAULT_TRADING_DIRECTIONS: readonly TradingDirection[] = TRADING_DIRECTIONS

/** 每一種組合買入、賣出各代表什麼。名字借交易模式那一張表，兩邊因此說同一句話。 */
const DIRECTION_DESCRIPTIONS: Readonly<Record<ContractTradingMode, LocalizedTextVo>> = {
  longOnly: new LocalizedTextVo(
    '只勾做多：買入＝做多、賣出＝平多。',
    'Long only: buy opens a long, sell closes it.'),
  shortOnly: new LocalizedTextVo(
    '只勾做空：賣出＝做空、買入＝平空。',
    'Short only: sell opens a short, buy closes it.'),
  longShort: new LocalizedTextVo(
    '兩個都勾＝多空反手：買入＝做多（手上有空單就先平掉）、賣出＝做空（手上有多單就先平掉）。',
    'Both = long & short: buy goes long (closing any short first), sell goes short (closing any long first).'),
}

const DIRECTION_NAMES: Readonly<Record<TradingDirection, LocalizedTextVo>> = {
  long: new LocalizedTextVo('做多', 'Long'),
  short: new LocalizedTextVo('做空', 'Short'),
}

/**
 * Domain Model：一台合約機器人選的交易方向。
 *
 * **方向 → 交易模式的對照只住在這裡**：只有做多＝只做多、只有做空＝只做空、兩者＝多空反手。
 * 名字與交易模式那一張表共用，表單說明、詳細區、清單標記都問它。
 *
 * 建構時正規化：認不得的拼法拿掉、重複的合併、照固定順序（做多在前）。
 */
export class StrategyBotTradingDirectionsDomain {
  readonly directions: readonly TradingDirection[]

  constructor(declared: readonly string[]) {
    this.directions = TRADING_DIRECTIONS.filter(direction => declared.includes(direction))
  }

  /** 一個方向都沒選：合約機器人送不出去。 */
  get rejection(): LocalizedTextVo | null {
    return this.directions.length === 0
      ? new LocalizedTextVo('至少要選一個交易方向', 'Pick at least one trading direction')
      : null
  }

  /** 買入、賣出各代表什麼。一個都沒選時說不出意思，是 `null`。 */
  description(): LocalizedTextVo | null {
    const contractTradingMode = this.contractTradingMode()

    return contractTradingMode === null ? null : DIRECTION_DESCRIPTIONS[contractTradingMode]
  }

  /** 詳細區那一句：「做多＋做空（多空反手）」。 */
  label(): LocalizedTextVo | null {
    const contractTradingMode = this.contractTradingMode()
    if (contractTradingMode === null) {
      return null
    }

    const modeLabel = new ContractTradingModeDomain(contractTradingMode).label()

    return new LocalizedTextVo(
      `${this.directions.map(direction => DIRECTION_NAMES[direction].traditionalChinese).join('＋')}（${modeLabel.traditionalChinese}）`,
      `${this.directions.map(direction => DIRECTION_NAMES[direction].english).join(' + ')} (${modeLabel.english})`)
  }

  /** 清單那一列的簡稱：交易模式的名字（例如「只做空」）。 */
  shortLabel(): LocalizedTextVo | null {
    const contractTradingMode = this.contractTradingMode()

    return contractTradingMode === null ? null : new ContractTradingModeDomain(contractTradingMode).label()
  }

  private contractTradingMode(): ContractTradingMode | null {
    const facesLong = this.directions.includes('long')
    const facesShort = this.directions.includes('short')

    if (facesLong && facesShort) {
      return 'longShort'
    }
    if (facesLong) {
      return 'longOnly'
    }

    return facesShort ? 'shortOnly' : null
  }
}
