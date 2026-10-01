import type { StrategyBotApplication } from '~/application/strategy-bot-application'
import type { AutoOrderRefusalDto } from '~/domain/models/dto/auto-order-refusal-dto'
import type { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

export function useStrategyBotAutoOrder(strategyBotApplication: StrategyBotApplication) {
  const switchingStrategyBotId = ref<number | null>(null)
  const refusal = ref<AutoOrderRefusalDto | null>(null)
  const failureMessage = ref<string | null>(null)
  const failedStrategyBotId = ref<number | null>(null)

  async function switchAutoOrder(strategyBotId: number, enabled: boolean): Promise<StrategyBotDto | null> {
    switchingStrategyBotId.value = strategyBotId
    refusal.value = null
    failureMessage.value = null
    failedStrategyBotId.value = null

    try {
      if (!enabled) {
        return await strategyBotApplication.disableAutoOrder(strategyBotId)
      }

      const result = await strategyBotApplication.enableAutoOrder(strategyBotId)
      refusal.value = result.refusal

      return result.strategyBot
    }
    catch (error: unknown) {
      failedStrategyBotId.value = strategyBotId
      failureMessage.value = error instanceof BackendUnreachableError
        ? error.explanation
        : error instanceof Error ? error.message : '自動下單沒有切換成功。'

      return null
    }
    finally {
      switchingStrategyBotId.value = null
    }
  }

  function refusalFor(strategyBotId: number): AutoOrderRefusalDto | null {
    return refusal.value?.strategyBotId === strategyBotId ? refusal.value : null
  }

  function failureMessageFor(strategyBotId: number): string | null {
    return failedStrategyBotId.value === strategyBotId ? failureMessage.value : null
  }

  return {
    switchingStrategyBotId,
    switchAutoOrder,
    refusalFor,
    failureMessageFor,
  }
}
