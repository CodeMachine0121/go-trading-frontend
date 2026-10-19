import type Decimal from 'decimal.js'
import { SymbolScreeningTermsDto } from '~/domain/models/dto/symbol-screening-terms-dto'
import { ContractTradingModeDomain } from '~/domain/models/domains/contract-trading-mode-domain'
import { SymbolScreeningAggregationIntervalDomain } from '~/domain/models/domains/symbol-screening-aggregation-interval-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'

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

  toDto(): SymbolScreeningTermsDto {
    return new SymbolScreeningTermsDto(
      this.aggregationInterval,
      new SymbolScreeningAggregationIntervalDomain(this.aggregationInterval).label(),
      this.tradingMode,
      new ContractTradingModeDomain(this.tradingMode).label(),
      this.leverage,
      this.entryCostPercentage,
      this.slippagePercentage,
      this.historyDays,
      this.segmentCount,
      this.minimumTradeCount,
      this.minimumAverageDailyQuoteVolume,
      new JournalNumberDomain(this.minimumAverageDailyQuoteVolume).priceAt(0),
      this.baselineSymbols,
    )
  }
}
