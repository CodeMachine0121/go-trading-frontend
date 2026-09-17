import type { StrategyScriptService } from '~/domain/service/strategy-script-service'
import type { StrategyScriptContentDto } from '~/domain/models/dto/strategy-script-content-dto'
import type { AvailableStrategyScriptsDto } from '~/domain/models/dto/available-strategy-scripts-dto'
import type { StrategyScriptDto } from '~/domain/models/dto/strategy-script-dto'
import type { StrategyScriptWriteDto } from '~/domain/models/dto/strategy-script-write-dto'

/** Application：策略腳本庫的用例編排，全程只碰 DTO。 */
export class StrategyScriptApplication {
  constructor(private readonly strategyScriptService: StrategyScriptService) {}

  async listAvailableStrategyScripts(): Promise<AvailableStrategyScriptsDto> {
    return this.strategyScriptService.listAvailableStrategyScripts()
  }

  async saveStrategyScript(strategyScriptWriteDto: StrategyScriptWriteDto): Promise<StrategyScriptDto> {
    return this.strategyScriptService.saveStrategyScript(strategyScriptWriteDto)
  }

  async deleteStrategyScript(id: number): Promise<void> {
    return this.strategyScriptService.deleteStrategyScript(id)
  }

  async publishStrategyScript(id: number): Promise<void> {
    return this.strategyScriptService.publishStrategyScript(id)
  }

  async withdrawStrategyScript(id: number): Promise<void> {
    return this.strategyScriptService.withdrawStrategyScript(id)
  }

  hasUnsavedChanges(
    loadedContent: StrategyScriptContentDto | null,
    currentContent: StrategyScriptContentDto,
  ): boolean {
    return this.strategyScriptService.hasUnsavedChanges(loadedContent, currentContent)
  }
}
