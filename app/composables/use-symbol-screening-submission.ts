import type { SymbolScreeningApplication } from '~/application/symbol-screening-application'
import type { SymbolScreeningRunDto } from '~/domain/models/dto/symbol-screening-run-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { SymbolScreeningRunSubmissionDto } from '~/domain/models/dto/symbol-screening-run-submission-dto'
import { useSymbolScreeningFailureMessage } from '~/composables/use-symbol-screening-failure-message'

export function useSymbolScreeningSubmission(symbolScreeningApplication: SymbolScreeningApplication) {
  const { failureMessageOf } = useSymbolScreeningFailureMessage()

  const profileId = ref<number | null>(null)
  const symbols = ref('')
  const submitting = ref(false)
  const failureMessage = ref<LocalizedTextVo | null>(null)

  async function submit(): Promise<SymbolScreeningRunDto | null> {
    if (profileId.value === null || submitting.value) {
      return null
    }

    submitting.value = true
    failureMessage.value = null

    try {
      const submitted = await symbolScreeningApplication.submitRun(
        new SymbolScreeningRunSubmissionDto(profileId.value, symbols.value))
      symbols.value = ''

      return submitted
    }
    catch (error: unknown) {
      failureMessage.value = failureMessageOf(error)

      return null
    }
    finally {
      submitting.value = false
    }
  }

  return { profileId, symbols, submitting, failureMessage, submit }
}
