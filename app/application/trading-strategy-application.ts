import type { TradingStrategyService } from '~/domain/service/trading-strategy-service'
import type { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import type { TradingStrategyWriteDto } from '~/domain/models/dto/trading-strategy-write-dto'

/** Application：交易策略的用例編排，全程只碰 DTO。 */
export class TradingStrategyApplication {
  constructor(private readonly tradingStrategyService: TradingStrategyService) {}

  async listTradingStrategies(): Promise<TradingStrategyDto[]> {
    return this.tradingStrategyService.listTradingStrategies()
  }

  async getTradingStrategy(id: number): Promise<TradingStrategyDto> {
    return this.tradingStrategyService.getTradingStrategy(id)
  }

  async saveTradingStrategy(writeDto: TradingStrategyWriteDto): Promise<TradingStrategyDto> {
    return this.tradingStrategyService.saveTradingStrategy(writeDto)
  }

  async deleteTradingStrategy(id: number): Promise<void> {
    return this.tradingStrategyService.deleteTradingStrategy(id)
  }
}
