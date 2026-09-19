import type { StrategyScript } from '~/domain/models/entities/strategy-script'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { StrategyScriptContentDto } from '~/domain/models/dto/strategy-script-content-dto'
import { StrategyScriptDto } from '~/domain/models/dto/strategy-script-dto'

/**
 * Domain Model：一支已存策略腳本對畫面的樣子。
 *
 * **算式一字不動地交出去。** 存下來的本來就是一整份——使用者當初在編輯器裡看到的
 * 那一份——所以這裡沒有什麼要拆，也沒有「拆不出來」這回事。
 */
export class StrategyScriptDomain {
  constructor(private readonly strategyScript: StrategyScript) {}

  toDto(): StrategyScriptDto {
    const resultType = new IndicatorResultTypeDomain(this.strategyScript.resultType)

    return new StrategyScriptDto(
      this.strategyScript.id,
      this.strategyScript.name,
      this.strategyScript.description,
      new StrategyScriptContentDto(
        this.strategyScript.script, resultType.value, this.strategyScript.parameters),
      // 畫得成線的條件就是「值是數字」。既有的種類模型已經知道這件事，
      // 這裡借用它而不是再比對一次種類——多一套判斷就多一個會漂移的地方。
      resultType.holdsNumbers(),
      this.strategyScript.published,
    )
  }
}
