import { LocalizedError } from '~/domain/errors/localized-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

export function useSymbolScreeningFailureMessage() {
  const { translatedText } = useLocalizedText()

  function failureMessageOf(error: unknown): LocalizedTextVo {
    if (error instanceof BackendUnreachableError) {
      return translatedText('symbolScreening.common.unreachable')
    }
    if (error instanceof LocalizedError) {
      return error.localizedMessage
    }

    return error instanceof Error
      ? new UntranslatedTextVo(error.message)
      : translatedText('symbolScreening.common.unknownFailure')
  }

  return { failureMessageOf }
}
