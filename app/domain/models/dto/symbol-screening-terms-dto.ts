import type Decimal from 'decimal.js'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class SymbolScreeningTermsDto {
  constructor(
    public readonly aggregationInterval: string,
    public readonly aggregationIntervalLabel: LocalizedTextVo,
    public readonly tradingMode: string,
    public readonly tradingModeLabel: LocalizedTextVo,
    public readonly leverage: Decimal,
    public readonly entryCostPercentage: Decimal,
    public readonly slippagePercentage: Decimal,
    public readonly historyDays: number,
    public readonly segmentCount: number,
    public readonly minimumTradeCount: number,
    public readonly minimumAverageDailyQuoteVolume: Decimal,
    public readonly minimumAverageDailyQuoteVolumeText: string,
    public readonly baselineSymbols: readonly string[],
  ) {}
}
