import type { IBinanceTradingKeyProxy } from '~/domain/interface/i-binance-trading-key-proxy'
import type { BinanceTradingKeyDto } from '~/domain/models/dto/binance-trading-key-dto'
import type { BinanceTradingKeyWriteDto } from '~/domain/models/dto/binance-trading-key-write-dto'
import { BinanceTradingKeyWriteDomain } from '~/domain/models/domains/binance-trading-key-write-domain'

export class BinanceTradingKeyService {
  constructor(private readonly binanceTradingKeyProxy: IBinanceTradingKeyProxy) {}

  async loadTradingKey(): Promise<BinanceTradingKeyDto> {
    const binanceTradingKey = await this.binanceTradingKeyProxy.fetchTradingKey()

    return binanceTradingKey.toDomain().toDto()
  }

  async saveTradingKey(writeDto: BinanceTradingKeyWriteDto): Promise<BinanceTradingKeyDto> {
    const writeDomain = new BinanceTradingKeyWriteDomain(writeDto)
    const rejection = writeDomain.rejection
    if (rejection !== null) {
      throw rejection
    }

    const binanceTradingKey = await this.binanceTradingKeyProxy.saveTradingKey(
      writeDomain.toWriteDto())

    return binanceTradingKey.toDomain().toDto()
  }

  async removeTradingKey(): Promise<void> {
    await this.binanceTradingKeyProxy.removeTradingKey()
  }
}
