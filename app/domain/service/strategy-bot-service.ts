import type { IStrategyBotProxy } from '~/domain/interface/i-strategy-bot-proxy'
import { StrategyBotWriteDomain } from '~/domain/models/domains/strategy-bot-write-domain'
import type { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import type { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { StrategyBotRejectedError } from '~/domain/errors/strategy-bot-rejected-error'

/**
 * Domain Service：策略機器人的編排。
 * 公開用例方法之間互不呼叫。
 */
export class StrategyBotService {
  constructor(private readonly strategyBotProxy: IStrategyBotProxy) {}

  /** 自己的每一台。一台都沒有是答案，不是錯誤。 */
  async listStrategyBots(): Promise<StrategyBotDto[]> {
    const bots = await this.strategyBotProxy.listStrategyBots()

    return bots.map(bot => bot.toDomain().toDto())
  }

  async getStrategyBot(id: number): Promise<StrategyBotDto> {
    const bot = await this.strategyBotProxy.getStrategyBot(id)

    return bot.toDomain().toDto()
  }

  /**
   * 存一台。**帶識別碼就是改那一台，不帶就是新增**——呼叫端因此不必先判斷自己算哪一種，
   * 也不會有兩條各自演化的存檔路徑。
   *
   * 內容擋得住的在這裡就被擋下，**一個字都不會送出去**：讓使用者為了一個
   * 這一側早就知道的錯誤等一次往返，是拿他的時間換一行沒寫的程式。
   */
  async saveStrategyBot(strategyBotWriteDto: StrategyBotWriteDto): Promise<StrategyBotDto> {
    const writeDomain = new StrategyBotWriteDomain(strategyBotWriteDto)

    const rejection = writeDomain.rejection
    if (rejection !== null) {
      throw new StrategyBotRejectedError(rejection)
    }

    const saved = writeDomain.id === undefined
      ? await this.strategyBotProxy.createStrategyBot(writeDomain)
      : await this.strategyBotProxy.updateStrategyBot(writeDomain)

    return saved.toDomain().toDto()
  }

  async deleteStrategyBot(id: number): Promise<void> {
    await this.strategyBotProxy.deleteStrategyBot(id)
  }

  async startStrategyBot(id: number): Promise<StrategyBotDto> {
    const started = await this.strategyBotProxy.startStrategyBot(id)

    return started.toDomain().toDto()
  }

  async stopStrategyBot(id: number): Promise<StrategyBotDto> {
    const stopped = await this.strategyBotProxy.stopStrategyBot(id)

    return stopped.toDomain().toDto()
  }
}
