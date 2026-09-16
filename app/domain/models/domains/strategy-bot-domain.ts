import type { StrategyBot, StrategyBotCondition, StrategyBotSignalSource } from '~/domain/models/entities/strategy-bot'
import { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import { StrategyBotConditionNodeIdVo } from '~/domain/models/vo/strategy-bot-condition-node-id-vo'
import { StrategyBotRunStateDomain } from '~/domain/models/domains/strategy-bot-run-state-domain'
import {
  StrategyBotParameterValueDto,
  StrategyBotSignalSourceDto,
} from '~/domain/models/dto/strategy-bot-signal-source-dto'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'
import { CONDITION_OPERATORS } from '~/domain/models/vo/condition-operator-vo'

/**
 * Domain Model：一台已存機器人對畫面的樣子。
 *
 * 它做的事是把後端存的那棵扁平不帶識別碼的樹，**在讀回來的這一刻補上畫面用的節點識別碼**。
 * 補在這裡而不是補在元件裡，是因為元件每次重繪都會重補一次新的識別碼——
 * 那正好毀掉識別碼存在的理由（它必須在同一份資料的兩次繪製之間不變）。
 *
 * 認不得的運算子與停擺原因一律當成沒有，而不是原樣傳給畫面：
 * 畫面只認得它畫得出來的那幾種，收到一個第五種停擺原因會顯示一格空白，
 * 而空白在這份清單上的意思是「這台沒事」——那是最糟的一種誤讀。
 */
export class StrategyBotDomain {
  constructor(private readonly strategyBot: StrategyBot) {}

  toDto(): StrategyBotDto {
    return new StrategyBotDto(
      this.strategyBot.id,
      this.strategyBot.name,
      this.strategyBot.symbol,
      this.strategyBot.triggerIntervalMinutes,
      this.strategyBot.signalSources.map(source => this.toSignalSourceDto(source)),
      this.toConditionDto(this.strategyBot.buyCondition),
      this.toConditionDto(this.strategyBot.sellCondition),
      new StrategyBotRunStateDomain(this.strategyBot).toDto(),
    )
  }

  private toSignalSourceDto(source: StrategyBotSignalSource): StrategyBotSignalSourceDto {
    return new StrategyBotSignalSourceDto(
      source.label,
      source.strategyId,
      source.aggregationInterval,
      source.parameterValues.map(
        parameterValue => new StrategyBotParameterValueDto(
          parameterValue.name, parameterValue.value)),
    )
  }

  private toConditionDto(
    condition: StrategyBotCondition | null,
  ): StrategyBotConditionDto | null {
    if (condition === null) {
      return null
    }

    const operator = this.toOperator(condition.operator)

    return new StrategyBotConditionDto(
      new StrategyBotConditionNodeIdVo().value,
      operator,
      operator === null
        ? []
        : condition.conditions.map(child => this.toConditionDto(child)!),
      condition.sourceLabel,
      condition.signal,
    )
  }

  private toOperator(operator: string): ConditionOperatorVo | null {
    return CONDITION_OPERATORS.find(known => known === operator) ?? null
  }
}
