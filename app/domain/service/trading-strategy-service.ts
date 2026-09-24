import type { ITradingStrategyProxy } from '~/domain/interface/i-trading-strategy-proxy'
import { TradingStrategyWriteDomain } from '~/domain/models/domains/trading-strategy-write-domain'
import type { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import type { TradingStrategyWriteDto } from '~/domain/models/dto/trading-strategy-write-dto'
import { TradingStrategyRejectedError } from '~/domain/errors/trading-strategy-rejected-error'
import type { MarketDataKindOptionDto } from '~/domain/models/dto/market-data-kind-option-dto'
import { MarketDataKindDomain } from '~/domain/models/domains/market-data-kind-domain'
import { MARKET_DATA_KINDS } from '~/domain/models/vo/market-data-kind-vo'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'
import type { ContractTradingModeOptionDto } from '~/domain/models/dto/contract-trading-mode-option-dto'
import { ContractTradingModeDomain } from '~/domain/models/domains/contract-trading-mode-domain'
import { CONTRACT_TRADING_MODES } from '~/domain/models/vo/contract-trading-mode-vo'

/**
 * Domain Service：交易策略的編排。
 * 公開用例方法之間互不呼叫。
 */
export class TradingStrategyService {
  constructor(private readonly tradingStrategyProxy: ITradingStrategyProxy) {}

  /** 自己的每一份。一份都沒有是答案，不是錯誤。 */
  async listTradingStrategies(): Promise<TradingStrategyDto[]> {
    const tradingStrategies = await this.tradingStrategyProxy.listTradingStrategies()

    return tradingStrategies.map(one => one.toDomain().toDto())
  }

  /**
   * 這一種機器人跟得了的那幾份：行情種類與它相同的。
   *
   * 現貨機器人只跟 K 線交易策略、合約機器人只跟合約交易策略——挑到另一種只會在存下時被交易服務拒絕，
   * 所以選單上根本不列。
   */
  async listTradingStrategiesFollowableBy(
    marketDataKind: MarketDataKind,
  ): Promise<TradingStrategyDto[]> {
    const botKind = new MarketDataKindDomain(marketDataKind)
    const tradingStrategies = await this.tradingStrategyProxy.listTradingStrategies()

    return tradingStrategies
      .map(one => one.toDomain().toDto())
      .filter(one => botKind.isSameAs(new MarketDataKindDomain(one.marketDataKind)))
  }

  async getTradingStrategy(id: number): Promise<TradingStrategyDto> {
    const tradingStrategy = await this.tradingStrategyProxy.getTradingStrategy(id)

    return tradingStrategy.toDomain().toDto()
  }

  /**
   * 存一份。**帶識別碼就是改那一份，不帶就是新增**——呼叫端因此不必先判斷自己算哪一種，
   * 也不會有兩條各自演化的存檔路徑。
   *
   * 內容擋得住的在這裡就被擋下，**一個字都不會送出去**：讓使用者為了一個
   * 這一側早就知道的錯誤等一次往返，是拿他的時間換一行沒寫的程式。
   */
  async saveTradingStrategy(writeDto: TradingStrategyWriteDto): Promise<TradingStrategyDto> {
    const writeDomain = new TradingStrategyWriteDomain(writeDto)

    const rejection = writeDomain.rejection
    if (rejection !== null) {
      throw new TradingStrategyRejectedError(rejection)
    }

    const saved = writeDomain.id === undefined
      ? await this.tradingStrategyProxy.createTradingStrategy(writeDomain)
      : await this.tradingStrategyProxy.updateTradingStrategy(writeDomain)

    return saved.toDomain().toDto()
  }

  async deleteTradingStrategy(id: number): Promise<void> {
    return this.tradingStrategyProxy.deleteTradingStrategy(id)
  }

  /** 一份交易策略可以吃的那兩種行情，第一個是新拼一份時的預設。 */
  listMarketDataKindOptions(): MarketDataKindOptionDto[] {
    return MARKET_DATA_KINDS.map(kind => new MarketDataKindDomain(kind).toOptionDto())
  }

  /** 合約交易策略可以選的交易模式，第一個是預設。 */
  listContractTradingModeOptions(): ContractTradingModeOptionDto[] {
    return CONTRACT_TRADING_MODES.map(mode => new ContractTradingModeDomain(mode).toOptionDto())
  }
}
