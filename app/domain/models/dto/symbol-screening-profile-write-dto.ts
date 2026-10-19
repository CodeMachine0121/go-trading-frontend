import type { SymbolScreeningParameterValueVo } from '~/domain/models/vo/symbol-screening-parameter-value-vo'

export class SymbolScreeningProfileWriteDto {
  constructor(
    public readonly id: number | null,
    public readonly name: string,
    public readonly strategyScriptId: number,
    public readonly aggregationInterval: string,
    public readonly tradingMode: string,
    public readonly leverage: string,
    public readonly entryCostPercentage: string,
    public readonly slippagePercentage: string,
    public readonly historyDays: string,
    public readonly segmentCount: string,
    public readonly minimumTradeCount: string,
    public readonly minimumAverageDailyQuoteVolume: string,
    public readonly baselineSymbols: string,
    public readonly parameterValues: readonly SymbolScreeningParameterValueVo[] = [],
  ) {}
}
