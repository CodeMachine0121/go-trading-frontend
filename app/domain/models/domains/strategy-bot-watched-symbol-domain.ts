import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { StrategyBotWatchedSymbol } from '~/domain/models/entities/strategy-bot-watched-symbol'
import type { MarketDataKindDomain } from '~/domain/models/domains/market-data-kind-domain'
import { StrategyBotHaltReasonDomain } from '~/domain/models/domains/strategy-bot-halt-reason-domain'
import { AutoOrderPositionDomain } from '~/domain/models/domains/auto-order-position-domain'
import { StrategyBotWatchedSymbolDto } from '~/domain/models/dto/strategy-bot-watched-symbol-dto'

export class StrategyBotWatchedSymbolDomain {
  private readonly haltReason: StrategyBotHaltReasonDomain

  constructor(
    private readonly watchedSymbol: StrategyBotWatchedSymbol,
    private readonly marketDataKind: MarketDataKindDomain,
  ) {
    this.haltReason = new StrategyBotHaltReasonDomain(watchedSymbol.haltReason)
  }

  get isHalted(): boolean {
    return this.haltReason.isKnown
  }

  get isConflicting(): boolean {
    return this.watchedSymbol.conflicting
  }

  toDto(): StrategyBotWatchedSymbolDto {
    return new StrategyBotWatchedSymbolDto(
      this.watchedSymbol.symbol,
      this.marketDataKind.strategyBotSymbolLabel(this.watchedSymbol.symbol),
      this.stateLabel,
      this.stateTone,
      this.lastSentSignalLabel,
      this.isConflicting,
      this.isHalted,
      this.haltReason.label,
      this.watchedSymbol.autoOrderPosition === null
        ? null
        : new AutoOrderPositionDomain(this.watchedSymbol.autoOrderPosition).toLabel(),
    )
  }

  private get stateLabel(): LocalizedTextVo {
    if (this.isHalted) {
      return new LocalizedTextVo('停擺', 'Halted')
    }

    return this.isConflicting ? new LocalizedTextVo('規則打架了', 'Rules conflict') : this.lastSentSignalLabel
  }

  private get stateTone(): 'danger' | 'warning' | 'neutral' {
    if (this.isHalted) {
      return 'danger'
    }

    return this.isConflicting ? 'warning' : 'neutral'
  }

  private get lastSentSignalLabel(): LocalizedTextVo {
    switch (this.watchedSymbol.lastSentSignal) {
      case 'buy':
        return new LocalizedTextVo('買入', 'Buy')
      case 'sell':
        return new LocalizedTextVo('賣出', 'Sell')
      case 'hold':
        return new LocalizedTextVo('持有', 'Hold')
      default:
        return new LocalizedTextVo('還沒送出過', 'None sent yet')
    }
  }
}
