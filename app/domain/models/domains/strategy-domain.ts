import type { Strategy } from '~/domain/models/entities/strategy'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'
import { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'
import { StrategyDto } from '~/domain/models/dto/strategy-dto'

/**
 * Domain Model：一支已存策略對畫面的樣子。
 *
 * 它做的事只有一件：把後端存的**一整段算式拆回使用者寫的那幾行**，
 * 並把「認不認得出外框」一起交出去。認不出來時內容是整段原文，
 * 畫面據此告訴使用者這一支看起來不是在這裡寫出來的。
 */
export class StrategyDomain {
  constructor(private readonly strategy: Strategy) {}

  toDto(): StrategyDto {
    const resultType = new IndicatorResultTypeDomain(this.strategy.resultType)
    const scriptBody = new IndicatorScriptDomain(resultType).disassemble(this.strategy.script)

    return new StrategyDto(
      this.strategy.id,
      this.strategy.name,
      new StrategyContentDto(scriptBody.body, resultType.value),
      scriptBody.frameRecognised,
    )
  }
}
