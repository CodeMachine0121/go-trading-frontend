import type Decimal from 'decimal.js'
import { SymbolScreeningTermsDto } from '~/domain/models/dto/symbol-screening-terms-dto'
import { ContractTradingModeDomain } from '~/domain/models/domains/contract-trading-mode-domain'
import { SYMBOL_SCREENING_AGGREGATION_INTERVALS } from '~/domain/models/vo/symbol-screening-aggregation-interval-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

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
    const interval = SYMBOL_SCREENING_AGGREGATION_INTERVALS.find(
      candidate => candidate.value === this.aggregationInterval)

    return new SymbolScreeningTermsDto(
      this.aggregationInterval,
      interval?.label ?? new UntranslatedTextVo(this.aggregationInterval),
      this.tradingMode,
      new ContractTradingModeDomain(this.tradingMode).label(),
      this.leverage,
      this.entryCostPercentage,
      this.slippagePercentage,
      this.historyDays,
      this.segmentCount,
      this.minimumTradeCount,
      this.minimumAverageDailyQuoteVolume,
      this.baselineSymbols,
    )
  }
}
