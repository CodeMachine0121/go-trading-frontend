import type { StrategyBotApplication } from '~/application/strategy-bot-application'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { AutoOrderRefusalDto } from '~/domain/models/dto/auto-order-refusal-dto'
import type { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

export function useStrategyBotAutoOrder(strategyBotApplication: StrategyBotApplication) {
  const switchingStrategyBotId = ref<number | null>(null)
  const refusal = ref<AutoOrderRefusalDto | null>(null)
  const failureMessage = ref<LocalizedTextVo | null>(null)
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
      failureMessage.value = messageOf(error)

      return null
    }
    finally {
      switchingStrategyBotId.value = null
    }
  }

  function refusalFor(strategyBotId: number): AutoOrderRefusalDto | null {
    return refusal.value?.strategyBotId === strategyBotId ? refusal.value : null
  }

  function failureMessageFor(strategyBotId: number): LocalizedTextVo | null {
    return failedStrategyBotId.value === strategyBotId ? failureMessage.value : null
  }

  function messageOf(error: unknown): LocalizedTextVo {
    if (error instanceof BackendUnreachableError) {
      return error.explanation
    }

    if (error instanceof Error && 'localizedMessage' in error
      && error.localizedMessage instanceof LocalizedTextVo) {
      return error.localizedMessage
    }

    // 認不得的錯誤帶的是別人說的原文，照抄、不翻。
    return error instanceof Error
      ? new UntranslatedTextVo(error.message)
      : new LocalizedTextVo('自動下單沒有切換成功。', 'Auto-order could not be switched.')
  }

  return {
    switchingStrategyBotId,
    switchAutoOrder,
    refusalFor,
    failureMessageFor,
  }
}
