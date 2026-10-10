import { LocalizedError } from '~/domain/errors/localized-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

/** 讀、取消回測輪次失敗時要說的那一句：連不上就說連不上，其餘照錯誤自己的說法。列表與明細共用。 */
export function useBacktestRunFailureMessage() {
  const { translatedText } = useLocalizedText()

  function failureMessageOf(error: unknown): LocalizedTextVo {
    if (error instanceof BackendUnreachableError) {
      return translatedText('backtest.common.unreachable')
    }
    if (error instanceof LocalizedError) {
      return error.localizedMessage
    }

    return error instanceof Error
      ? new UntranslatedTextVo(error.message)
      : translatedText('backtest.runs.unknownFailure')
  }

  return { failureMessageOf }
}
