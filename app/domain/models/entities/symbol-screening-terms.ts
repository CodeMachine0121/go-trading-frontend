import type Decimal from 'decimal.js'
import { SymbolScreeningTermsDomain } from '~/domain/models/domains/symbol-screening-terms-domain'

export class SymbolScreeningTerms {
  constructor(
    public readonly aggregationInterval: string,
    public readonly tradingMode: string,
    public readonly leverage: Decimal,
    public readonly entryCostPercentage: Decimal,
    public readonly slippagePercentage: Decimal,
    public readonly historyDays: number,
    public readonly segmentCount: number,
    public readonly minimumTradeCount: number,
    public readonly minimumAverageDailyQuoteVolume: Decimal,
    public readonly baselineSymbols: readonly string[],
  ) {}

  toDomain(): SymbolScreeningTermsDomain {
    return new SymbolScreeningTermsDomain(this)
  }
}
