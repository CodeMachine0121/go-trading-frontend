import type { BinanceTradingKeyService } from '~/domain/service/binance-trading-key-service'
import type { BinanceTradingKeyDto } from '~/domain/models/dto/binance-trading-key-dto'
import type { BinanceTradingKeyWriteDto } from '~/domain/models/dto/binance-trading-key-write-dto'

export class BinanceTradingKeyApplication {
  constructor(private readonly binanceTradingKeyService: BinanceTradingKeyService) {}

  async loadTradingKey(): Promise<BinanceTradingKeyDto> {
    return this.binanceTradingKeyService.loadTradingKey()
  }

  async saveTradingKey(writeDto: BinanceTradingKeyWriteDto): Promise<BinanceTradingKeyDto> {
    return this.binanceTradingKeyService.saveTradingKey(writeDto)
  }

  async removeTradingKey(): Promise<void> {
    await this.binanceTradingKeyService.removeTradingKey()
  }
}
