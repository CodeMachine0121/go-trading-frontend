import type { StrategyService } from '~/domain/service/strategy-service'
import type { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'
import type { StrategyDto } from '~/domain/models/dto/strategy-dto'
import type { StrategyWriteDto } from '~/domain/models/dto/strategy-write-dto'

/** Application：策略庫的用例編排，全程只碰 DTO。 */
export class StrategyApplication {
  constructor(private readonly strategyService: StrategyService) {}

  async listStrategies(): Promise<StrategyDto[]> {
    return this.strategyService.listStrategies()
  }

  async saveStrategy(strategyWriteDto: StrategyWriteDto): Promise<StrategyDto> {
    return this.strategyService.saveStrategy(strategyWriteDto)
  }

  async deleteStrategy(id: number): Promise<void> {
    return this.strategyService.deleteStrategy(id)
  }

  hasUnsavedChanges(
    loadedContent: StrategyContentDto | null,
    currentContent: StrategyContentDto,
  ): boolean {
    return this.strategyService.hasUnsavedChanges(loadedContent, currentContent)
  }
}
