import type {
  TradingStrategy,
  TradingStrategyCondition,
  TradingStrategySignalSource,
} from '~/domain/models/entities/trading-strategy'
import { TradingStrategyConditionDto } from '~/domain/models/dto/trading-strategy-condition-dto'
import { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import { TradingStrategyConditionNodeIdVo } from '~/domain/models/vo/trading-strategy-condition-node-id-vo'
import {
  StrategyBotParameterValueDto,
  TradingStrategySignalSourceDto,
} from '~/domain/models/dto/trading-strategy-signal-source-dto'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'
import { CONDITION_OPERATORS } from '~/domain/models/vo/condition-operator-vo'
import { MarketDataKindDomain } from '~/domain/models/domains/market-data-kind-domain'
import { ContractTradingModeDomain } from '~/domain/models/domains/contract-trading-mode-domain'

/**
 * Domain Model：一份已存交易策略對畫面的樣子。
 *
 * 它做的事是把後端存的那棵扁平不帶識別碼的樹，**在讀回來的這一刻補上畫面用的節點識別碼**。
 * 補在這裡而不是補在元件裡，是因為元件每次重繪都會重補一次新的識別碼——
 * 那正好毀掉識別碼存在的理由（它必須在同一份資料的兩次繪製之間不變）。
 *
 * 認不得的運算子一律當成沒有，而不是原樣傳給畫面：畫面只認得它畫得出來的那幾種。
 */
export class TradingStrategyDomain {
  constructor(private readonly tradingStrategy: TradingStrategy) {}

  toDto(): TradingStrategyDto {
    const marketDataKind = new MarketDataKindDomain(this.tradingStrategy.marketDataKind)
    const replaysOnContractAccount = marketDataKind.toWorkbenchDto().replaysOnContractAccount
    // 只有合約交易策略有交易模式；K 線那一種即使後端多給了一個字，也不把它讀成有。
    const tradingMode = replaysOnContractAccount
      ? new ContractTradingModeDomain(this.tradingStrategy.tradingMode)
      : null

    return new TradingStrategyDto(
      this.tradingStrategy.id,
      this.tradingStrategy.name,
      this.tradingStrategy.signalSources.map(source => this.toSignalSourceDto(source)),
      this.toConditionDto(this.tradingStrategy.buyCondition),
      this.toConditionDto(this.tradingStrategy.sellCondition),
      marketDataKind.value,
      marketDataKind.label(),
      tradingMode?.value ?? null,
      tradingMode?.label() ?? null,
      replaysOnContractAccount,
    )
  }

  private toSignalSourceDto(source: TradingStrategySignalSource): TradingStrategySignalSourceDto {
    return new TradingStrategySignalSourceDto(
      source.label,
      source.strategyScriptId,
      source.aggregationInterval,
      source.parameterValues.map(
        parameterValue => new StrategyBotParameterValueDto(
          parameterValue.name, parameterValue.value)),
    )
  }

  private toConditionDto(
    condition: TradingStrategyCondition | null,
  ): TradingStrategyConditionDto | null {
    if (condition === null) {
      return null
    }

    const operator = this.toOperator(condition.operator)

    return new TradingStrategyConditionDto(
      new TradingStrategyConditionNodeIdVo().value,
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
