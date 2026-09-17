import type { StrategyBot } from '~/domain/models/entities/strategy-bot'
import { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import { StrategyBotRunStateDomain } from '~/domain/models/domains/strategy-bot-run-state-domain'

/**
 * Domain Model：一台已存機器人對畫面的樣子。
 *
 * 認不得的停擺原因一律當成沒有，而不是原樣傳給畫面：畫面只認得它畫得出來的那幾種，
 * 收到一個第五種停擺原因會顯示一格空白，而空白在這份清單上的意思是「這台沒事」
 * ——那是最糟的一種誤讀。
 *
 * 規則長什麼樣不在這裡：那是 TradingStrategyDomain 的事。這裡只把那一份的名字
 * 帶過去，好讓清單說得出每一台照什麼跑。
 */
export class StrategyBotDomain {
  constructor(private readonly strategyBot: StrategyBot) {}

  toDto(): StrategyBotDto {
    return new StrategyBotDto(
      this.strategyBot.id,
      this.strategyBot.name,
      this.strategyBot.symbol,
      this.strategyBot.triggerIntervalMinutes,
      this.strategyBot.tradingStrategyId,
      this.strategyBot.tradingStrategyName,
      new StrategyBotRunStateDomain(this.strategyBot).toDto(),
    )
  }
}
