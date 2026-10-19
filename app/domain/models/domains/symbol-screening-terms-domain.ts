import type { SymbolScreeningTerms } from '~/domain/models/entities/symbol-screening-terms'
import { SymbolScreeningTermsDto } from '~/domain/models/dto/symbol-screening-terms-dto'
import { ContractTradingModeDomain } from '~/domain/models/domains/contract-trading-mode-domain'
import { SymbolScreeningAggregationIntervalDomain } from '~/domain/models/domains/symbol-screening-aggregation-interval-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'

export class SymbolScreeningTermsDomain {
  constructor(private readonly terms: SymbolScreeningTerms) {}

  toDto(): SymbolScreeningTermsDto {
    return new SymbolScreeningTermsDto(
      this.terms.aggregationInterval,
      new SymbolScreeningAggregationIntervalDomain(this.terms.aggregationInterval).label(),
      this.terms.tradingMode,
      new ContractTradingModeDomain(this.terms.tradingMode).label(),
      this.terms.leverage,
      this.terms.entryCostPercentage,
      this.terms.slippagePercentage,
      this.terms.historyDays,
      this.terms.segmentCount,
      this.terms.minimumTradeCount,
      this.terms.minimumAverageDailyQuoteVolume,
      new JournalNumberDomain(this.terms.minimumAverageDailyQuoteVolume).priceAt(0),
      this.terms.baselineSymbols,
    )
  }
}
