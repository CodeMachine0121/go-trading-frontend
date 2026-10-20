import { StrategyBotWatchedSymbolDomain } from '~/domain/models/domains/strategy-bot-watched-symbol-domain'
import type { MarketDataKindDomain } from '~/domain/models/domains/market-data-kind-domain'
import type { AutoOrderPositionVo } from '~/domain/models/vo/auto-order-position-vo'
import type { StrategyBotHaltReasonVo } from '~/domain/models/vo/strategy-bot-halt-reason-vo'
import Decimal from 'decimal.js'
import { StrategyBotCapitalAllocationDto } from '~/domain/models/dto/strategy-bot-capital-allocation-dto'

export class StrategyBotWatchedSymbol {
  constructor(
    public readonly symbol: string,
    public readonly lastSentSignal: string,
    public readonly conflicting: boolean,
    public readonly haltReason: StrategyBotHaltReasonVo | null,
    /** `null` for spot bots: only contract bots hold auto-order positions. */
    public readonly autoOrderPosition: AutoOrderPositionVo | null,
    public readonly allocationPercentage: Decimal = new Decimal(100),
  ) {}

  toDomain(marketDataKind: MarketDataKindDomain, allocatedCapital: Decimal | null): StrategyBotWatchedSymbolDomain {
    return new StrategyBotWatchedSymbolDomain(this, marketDataKind, allocatedCapital)
  }

  toCapitalAllocationDto(): StrategyBotCapitalAllocationDto {
    return new StrategyBotCapitalAllocationDto(this.symbol, this.allocationPercentage)
  }
}
