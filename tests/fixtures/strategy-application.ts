import { vi } from 'vitest'
import { StrategyApplication } from '~/application/strategy-application'
import { StrategyService } from '~/domain/service/strategy-service'
import type { IStrategyProxy } from '~/domain/interface/i-strategy-proxy'
import { Strategy } from '~/domain/models/entities/strategy'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'
import type { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'

/**
 * 策略來自後端，只 mock 它的介面；application、domain service 與所有 domain model 都是真的。
 * 預設一支都沒有——既有的測試因此不會因為多了一份清單而改變行為。
 */
export function buildStrategyApplication(
  strategyProxy: Partial<IStrategyProxy> = {},
): StrategyApplication {
  return new StrategyApplication(new StrategyService({
    listStrategies: vi.fn().mockResolvedValue([]),
    createStrategy: vi.fn(),
    updateStrategy: vi.fn(),
    deleteStrategy: vi.fn().mockResolvedValue(undefined),
    ...strategyProxy,
  }))
}

/** 一支存在後端那頭的策略，算式是**一整段**——與後端存的形狀一致。 */
export function buildStoredStrategy(
  id: number,
  name: string,
  overrides: {
    scriptBody?: string
    /** 整段算式直接給——用來造一支「不是在這裡寫出來的」策略。 */
    rawScript?: string
    resultType?: string
    parameters?: readonly StrategyParameterDto[]
  } = {},
): Strategy {
  const resultType = overrides.resultType ?? 'floatList'
  const script = overrides.rawScript
    ?? new IndicatorScriptDomain(new IndicatorResultTypeDomain(resultType))
      .assemble(overrides.scriptBody ?? 'sum := 0.0')

  return new Strategy(id, name, script, resultType, overrides.parameters ?? [])
}
