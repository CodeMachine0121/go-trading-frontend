import type { StrategyScript } from '~/domain/models/entities/strategy-script'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'
import { StrategyScriptContentDto } from '~/domain/models/dto/strategy-script-content-dto'
import { StrategyScriptDto } from '~/domain/models/dto/strategy-script-dto'

/**
 * Domain Model：一支已存策略腳本對畫面的樣子。
 *
 * 它做的事只有一件：把後端存的**一整段算式拆回使用者寫的那幾行**，
 * 並把「認不認得出外框」一起交出去。認不出來時內容是整段原文，
 * 畫面據此告訴使用者這一支看起來不是在這裡寫出來的。
 */
export class StrategyScriptDomain {
  constructor(private readonly strategyScript: StrategyScript) {}

  toDto(): StrategyScriptDto {
    const resultType = new IndicatorResultTypeDomain(this.strategyScript.resultType)
    const scriptBody = new IndicatorScriptDomain(resultType).disassemble(this.strategyScript.script)

    return new StrategyScriptDto(
      this.strategyScript.id,
      this.strategyScript.name,
      this.strategyScript.description,
      new StrategyScriptContentDto(scriptBody.body, resultType.value, this.strategyScript.parameters),
      scriptBody.frameRecognised,
      // 畫得成線的條件就是「值是數字」。既有的種類模型已經知道這件事，
      // 這裡借用它而不是再比對一次種類——多一套判斷就多一個會漂移的地方。
      resultType.holdsNumbers(),
      this.strategyScript.published,
    )
  }
}
