import type { StrategyBotService } from '~/domain/service/strategy-bot-service'
import type { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import type { StrategyBotRunRecordDto } from '~/domain/models/dto/strategy-bot-run-record-dto'
import type { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import type { StrategyBotPageDto } from '~/domain/models/dto/strategy-bot-page-dto'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'

/** Application：策略機器人的用例編排，全程只碰 DTO。 */
export class StrategyBotApplication {
  constructor(private readonly strategyBotService: StrategyBotService) {}

  async listStrategyBots(marketDataKind: MarketDataKind): Promise<StrategyBotDto[]> {
    return this.strategyBotService.listStrategyBots(marketDataKind)
  }

  pageFor(marketDataKind: MarketDataKind): StrategyBotPageDto {
    return this.strategyBotService.pageFor(marketDataKind)
  }

  async getStrategyBot(id: number): Promise<StrategyBotDto> {
    return this.strategyBotService.getStrategyBot(id)
  }

  async saveStrategyBot(strategyBotWriteDto: StrategyBotWriteDto): Promise<StrategyBotDto> {
    return this.strategyBotService.saveStrategyBot(strategyBotWriteDto)
  }

  async deleteStrategyBot(id: number): Promise<void> {
    return this.strategyBotService.deleteStrategyBot(id)
  }

  async startStrategyBot(id: number): Promise<StrategyBotDto> {
    return this.strategyBotService.startStrategyBot(id)
  }

  async stopStrategyBot(id: number): Promise<StrategyBotDto> {
    return this.strategyBotService.stopStrategyBot(id)
  }

  async runRoundNow(id: number): Promise<StrategyBotDto> {
    return this.strategyBotService.runRoundNow(id)
  }

  async listRunRecords(id: number): Promise<StrategyBotRunRecordDto[]> {
    return this.strategyBotService.listRunRecords(id)
  }
}
