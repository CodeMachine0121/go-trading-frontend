import type { BinanceTradingKey } from '~/domain/models/entities/binance-trading-key'
import type { BinanceTradingKeyWriteDto } from '~/domain/models/dto/binance-trading-key-write-dto'

export interface IBinanceTradingKeyProxy {
  fetchTradingKey(): Promise<BinanceTradingKey>

  saveTradingKey(writeDto: BinanceTradingKeyWriteDto): Promise<BinanceTradingKey>

  removeTradingKey(): Promise<void>
}
