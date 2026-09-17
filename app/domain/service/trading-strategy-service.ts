import type { ITradingStrategyProxy } from '~/domain/interface/i-trading-strategy-proxy'
import { TradingModeDomain } from '~/domain/models/domains/trading-mode-domain'
import { TradingStrategyWriteDomain } from '~/domain/models/domains/trading-strategy-write-domain'
import type { TradingModeOptionDto } from '~/domain/models/dto/trading-mode-option-dto'
import type { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import type { TradingStrategyWriteDto } from '~/domain/models/dto/trading-strategy-write-dto'
import { TRADING_MODES } from '~/domain/models/vo/trading-mode-vo'
import { TradingStrategyRejectedError } from '~/domain/errors/trading-strategy-rejected-error'

/**
 * Domain Service：交易策略的編排。
 * 公開用例方法之間互不呼叫。
 */
export class TradingStrategyService {
  constructor(private readonly tradingStrategyProxy: ITradingStrategyProxy) {}

  /**
   * 交易模式：工作檯那一列上可以挑的每一個，連那一句說明一起帶著。
   *
   * 名字與說明來自 TradingModeDomain，與回測那一列是同一份字串——
   * 使用者在兩塊畫面上讀到的必須是對同一件事的同一種說法。
   */
  listTradingModeOptions(): TradingModeOptionDto[] {
    return TRADING_MODES.map(mode => new TradingModeDomain(mode).toOptionDto())
  }

  /** 自己的每一份。一份都沒有是答案，不是錯誤。 */
  async listTradingStrategies(): Promise<TradingStrategyDto[]> {
    const tradingStrategies = await this.tradingStrategyProxy.listTradingStrategies()

    return tradingStrategies.map(one => one.toDomain().toDto())
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
}
