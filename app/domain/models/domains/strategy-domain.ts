import type { Strategy } from '~/domain/models/entities/strategy'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'
import { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'
import { StrategyDto } from '~/domain/models/dto/strategy-dto'
import type { AggregationIntervalValue } from '~/domain/models/vo/aggregation-interval-vo'
import { AGGREGATION_INTERVALS } from '~/domain/models/vo/aggregation-interval-vo'

/** 沒認出來的彙總刻度退回這一個——與後端「未指定視為五分鐘」的規則一致。 */
const DEFAULT_AGGREGATION_INTERVAL = AGGREGATION_INTERVALS[0]

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
      new StrategyContentDto(
        scriptBody.body,
        resultType.value,
        this.aggregationInterval(),
        this.strategy.candleCount,
      ),
      scriptBody.frameRecognised,
    )
  }

  /**
   * 後端說的彙總刻度，對上這裡認得的那五種。認不得就退回最細的那一種——
   * 讓畫面卡住或顯示一個空選項，都比退回一個明確的預設值糟。
   */
  private aggregationInterval(): AggregationIntervalValue {
    const matched = AGGREGATION_INTERVALS.find(
      interval => interval.value === this.strategy.aggregationInterval)

    return (matched ?? DEFAULT_AGGREGATION_INTERVAL).value
  }
}
