import type { SymbolScreeningService } from '~/domain/service/symbol-screening-service'
import type { AggregationIntervalOptionDto } from '~/domain/models/dto/aggregation-interval-option-dto'
import type { ContractTradingModeOptionDto } from '~/domain/models/dto/contract-trading-mode-option-dto'
import type { StrategyScriptDto } from '~/domain/models/dto/strategy-script-dto'
import type { SymbolScreeningProfileDto } from '~/domain/models/dto/symbol-screening-profile-dto'
import type { SymbolScreeningProfileWriteDto } from '~/domain/models/dto/symbol-screening-profile-write-dto'
import type { SymbolScreeningRunDto } from '~/domain/models/dto/symbol-screening-run-dto'
import type { SymbolScreeningRunDetailDto } from '~/domain/models/dto/symbol-screening-run-detail-dto'
import type { SymbolScreeningRunSubmissionDto } from '~/domain/models/dto/symbol-screening-run-submission-dto'

export class SymbolScreeningApplication {
  constructor(private readonly symbolScreeningService: SymbolScreeningService) {}

  listAggregationIntervalOptions(): AggregationIntervalOptionDto[] {
    return this.symbolScreeningService.listAggregationIntervalOptions()
  }

  listTradingModeOptions(): ContractTradingModeOptionDto[] {
    return this.symbolScreeningService.listTradingModeOptions()
  }

  async listProfiles(): Promise<SymbolScreeningProfileDto[]> {
    return this.symbolScreeningService.listProfiles()
  }

  async listScreenableStrategyScripts(): Promise<StrategyScriptDto[]> {
    return this.symbolScreeningService.listScreenableStrategyScripts()
  }

  async saveProfile(writeDto: SymbolScreeningProfileWriteDto): Promise<SymbolScreeningProfileDto> {
    return this.symbolScreeningService.saveProfile(writeDto)
  }

  async deleteProfile(id: number): Promise<void> {
    return this.symbolScreeningService.deleteProfile(id)
  }

  async submitRun(submissionDto: SymbolScreeningRunSubmissionDto): Promise<SymbolScreeningRunDto> {
    return this.symbolScreeningService.submitRun(submissionDto)
  }

  async listRuns(): Promise<SymbolScreeningRunDto[]> {
    return this.symbolScreeningService.listRuns(false)
  }

  async refreshRuns(): Promise<SymbolScreeningRunDto[]> {
    return this.symbolScreeningService.listRuns(true)
  }

  async getRun(id: number): Promise<SymbolScreeningRunDetailDto> {
    return this.symbolScreeningService.getRun(id, false)
  }

  async refreshRun(id: number): Promise<SymbolScreeningRunDetailDto> {
    return this.symbolScreeningService.getRun(id, true)
  }

  async cancelRun(id: number): Promise<SymbolScreeningRunDto> {
    return this.symbolScreeningService.cancelRun(id)
  }
}
