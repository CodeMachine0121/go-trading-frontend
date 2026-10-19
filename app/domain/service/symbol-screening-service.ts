import type { ISymbolScreeningProxy } from '~/domain/interface/i-symbol-screening-proxy'
import type { IStrategyScriptProxy } from '~/domain/interface/i-strategy-script-proxy'
import type { SymbolScreeningProfileDto } from '~/domain/models/dto/symbol-screening-profile-dto'
import type { SymbolScreeningProfileWriteDto } from '~/domain/models/dto/symbol-screening-profile-write-dto'
import type { SymbolScreeningRunDto } from '~/domain/models/dto/symbol-screening-run-dto'
import type { SymbolScreeningRunDetailDto } from '~/domain/models/dto/symbol-screening-run-detail-dto'
import type { SymbolScreeningRunSubmissionDto } from '~/domain/models/dto/symbol-screening-run-submission-dto'
import type { StrategyScriptDto } from '~/domain/models/dto/strategy-script-dto'
import { AggregationIntervalOptionDto } from '~/domain/models/dto/aggregation-interval-option-dto'
import { SymbolScreeningAggregationIntervalDomain } from '~/domain/models/domains/symbol-screening-aggregation-interval-domain'
import type { ContractTradingModeOptionDto } from '~/domain/models/dto/contract-trading-mode-option-dto'
import { ContractTradingModeDomain } from '~/domain/models/domains/contract-trading-mode-domain'
import { SYMBOL_SCREENING_AGGREGATION_INTERVALS } from '~/domain/models/vo/symbol-screening-aggregation-interval-vo'
import { CONTRACT_TRADING_MODES } from '~/domain/models/vo/contract-trading-mode-vo'
import { SymbolScreeningProfileWriteDomain } from '~/domain/models/domains/symbol-screening-profile-write-domain'

export class SymbolScreeningService {
  constructor(
    private readonly symbolScreeningProxy: ISymbolScreeningProxy,
    private readonly strategyScriptProxy: IStrategyScriptProxy,
  ) {}

  listAggregationIntervalOptions(): AggregationIntervalOptionDto[] {
    return SYMBOL_SCREENING_AGGREGATION_INTERVALS.map(interval => new AggregationIntervalOptionDto(
      interval, new SymbolScreeningAggregationIntervalDomain(interval).label()))
  }

  listTradingModeOptions(): ContractTradingModeOptionDto[] {
    return CONTRACT_TRADING_MODES.map(mode => new ContractTradingModeDomain(mode).toOptionDto())
  }

  async listProfiles(): Promise<SymbolScreeningProfileDto[]> {
    const profiles = await this.symbolScreeningProxy.listProfiles()

    return profiles.map(profile => profile.toDto())
  }

  async listScreenableStrategyScripts(): Promise<StrategyScriptDto[]> {
    const available = await this.strategyScriptProxy.listAvailableStrategyScripts()

    return available.mine
      .map(strategyScript => strategyScript.toDomain())
      .filter(strategyScriptDomain => strategyScriptDomain.screensSymbols)
      .map(strategyScriptDomain => strategyScriptDomain.toDto())
  }

  async saveProfile(writeDto: SymbolScreeningProfileWriteDto): Promise<SymbolScreeningProfileDto> {
    const profile = await this.symbolScreeningProxy.saveProfile(new SymbolScreeningProfileWriteDomain(writeDto))

    return profile.toDto()
  }

  async deleteProfile(id: number): Promise<void> {
    await this.symbolScreeningProxy.deleteProfile(id)
  }

  async submitRun(submissionDto: SymbolScreeningRunSubmissionDto): Promise<SymbolScreeningRunDto> {
    const run = await this.symbolScreeningProxy.submitRun(submissionDto)

    return run.toDomain().toDto()
  }

  async listRuns(inBackground: boolean): Promise<SymbolScreeningRunDto[]> {
    const runs = await this.symbolScreeningProxy.listRuns(inBackground)

    return runs.map(run => run.toDomain().toDto())
  }

  async getRun(id: number, inBackground: boolean): Promise<SymbolScreeningRunDetailDto> {
    const detail = await this.symbolScreeningProxy.getRun(id, inBackground)

    return detail.toDto()
  }

  async cancelRun(id: number): Promise<SymbolScreeningRunDto> {
    const run = await this.symbolScreeningProxy.cancelRun(id)

    return run.toDomain().toDto()
  }
}
