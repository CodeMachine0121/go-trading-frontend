import { PositionPlanDomain } from '~/domain/models/domains/position-plan-domain'
import { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { STRATEGY_BOT_LIMITS } from '~/domain/models/vo/strategy-bot-limits-vo'

/**
 * Domain Model：一台要存進去的機器人，連同它送出前必須成立的每一條規則。
 *
 * 它只問四件事，因為一台機器人現在只有四格：叫什麼、照哪一份交易策略跑、
 * 盯哪一個市場、多久醒一次。規則本身的每一條驗證都搬去
 * TradingStrategyWriteDomain 了——它們是規則的事，不是機器的事。
 *
 * 撞名與「指名一份已經不在的交易策略」不在這裡：那兩件事光看這份表單看不出來，
 * 必須問過伺服器才知道，所以由後端說、由畫面照它說的講。
 */
export class StrategyBotWriteDomain {
  constructor(private readonly writeDto: StrategyBotWriteDto) {}

  get id(): number | undefined {
    return this.writeDto.id
  }

  /**
   * 這份表單現在送不送得出去；送不出去時說出**第一個**擋住它的理由。
   *
   * 一次只說一個，而不是列出全部：使用者一次只改得動一格，
   * 而一張同時亮起五個紅字的表單，第一個反應是不知道要從哪裡開始。
   */
  get rejection(): string | null {
    const name = this.writeDto.name.trim()
    if (name === '') {
      return '必須給機器人取一個名稱'
    }

    if ([...name].length > STRATEGY_BOT_LIMITS.nameMaximumLength) {
      return `機器人名稱長度上限為 ${STRATEGY_BOT_LIMITS.nameMaximumLength} 個字`
    }

    // 一台沒有規則的機器人不是一台機器人，只是一台不知道要做什麼的機器。
    if (this.writeDto.tradingStrategyId === 0) {
      return '必須挑一份交易策略，這台機器人才知道要照什麼判斷'
    }

    if (this.writeDto.symbol.trim() === '') {
      return '必須指定這台機器人要盯哪一個交易標的'
    }

    if (this.writeDto.triggerIntervalMinutes < STRATEGY_BOT_LIMITS.triggerIntervalMinimumMinutes) {
      return '觸發間隔必須大於零'
    }

    if (this.writeDto.triggerIntervalMinutes > STRATEGY_BOT_LIMITS.triggerIntervalMaximumMinutes) {
      return `觸發間隔上限是 ${STRATEGY_BOT_LIMITS.triggerIntervalMaximumMinutes} 分鐘`
    }

    // 問在最後，因為前面那四格是必填的：一台連名字都沒有的機器人，
    // 先講它的槓桿沒有意義。
    //
    // 沒有部位規劃就**一句都不問**——那一台不建議部位，那五格填什麼都不影響它。
    // 這一行就是「區塊收著的時候一格都不看」。
    if (this.writeDto.positionPlan === null) {
      return null
    }

    return new PositionPlanDomain(this.writeDto.positionPlan).rejection
  }

  get isSendable(): boolean {
    return this.rejection === null
  }

  /** 送出去的那一份，名稱與標的前後空白都去掉了。 */
  get sendable(): StrategyBotWriteDto {
    return new StrategyBotWriteDto(
      this.writeDto.id,
      this.writeDto.name.trim(),
      this.writeDto.symbol.trim(),
      this.writeDto.tradingStrategyId,
      this.writeDto.triggerIntervalMinutes,
      // 沒有要正規化的東西：那五格是數字，沒有前後空白可以去。
      this.writeDto.positionPlan,
      this.writeDto.marketDataKind,
    )
  }
}
