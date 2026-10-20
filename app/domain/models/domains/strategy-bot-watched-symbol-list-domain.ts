import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { STRATEGY_BOT_LIMITS } from '~/domain/models/vo/strategy-bot-limits-vo'

export class StrategyBotWatchedSymbolListDomain {
  constructor(private readonly symbols: readonly string[]) {}

  get normalized(): string[] {
    return this.symbols.map(symbol => symbol.trim().toUpperCase())
  }

  get isFull(): boolean {
    return this.symbols.length >= STRATEGY_BOT_LIMITS.watchedSymbolCount
  }

  get rejection(): LocalizedTextVo | null {
    const normalized = this.normalized
    if (normalized.length === 0) {
      return new LocalizedTextVo('必須指定這台機器人要盯哪些交易標的', 'Choose which trading symbols the bot watches')
    }

    if (normalized.length > STRATEGY_BOT_LIMITS.watchedSymbolCount) {
      return new LocalizedTextVo(
        `一台機器人最多盯 ${STRATEGY_BOT_LIMITS.watchedSymbolCount} 個交易標的`,
        `A bot can watch at most ${STRATEGY_BOT_LIMITS.watchedSymbolCount} trading symbols`)
    }

    const duplicate = normalized.find((symbol, index) => normalized.indexOf(symbol) !== index)
    if (duplicate !== undefined) {
      return new LocalizedTextVo(`交易標的 ${duplicate} 重複了`, `Trading symbol ${duplicate} is listed twice`)
    }

    return null
  }

  adding(symbol: string): string[] {
    const added = symbol.trim().toUpperCase()
    if (added === '' || this.isFull || this.normalized.includes(added)) {
      return [...this.symbols]
    }

    return [...this.symbols, added]
  }

  removing(symbol: string): string[] {
    return this.symbols.filter(listed => listed !== symbol)
  }
}
