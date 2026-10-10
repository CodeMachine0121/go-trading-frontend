import type { BacktestApplication } from '~/application/backtest-application'
import type { BacktestRunDetailDto } from '~/domain/models/dto/backtest-run-detail-dto'
import { LocalizedError } from '~/domain/errors/localized-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

/** 點開的那一筆輪次：取明細、開著或關著、讀不到時說原因。列表頁與兩個回測區塊共用。 */
export function useBacktestRunDetail(backtestApplication: BacktestApplication) {
  const { translatedText } = useLocalizedText()

  const open = ref(false)
  const detail = ref<BacktestRunDetailDto | null>(null)
  const loading = ref(false)
  const failureMessage = ref<LocalizedTextVo | null>(null)

  async function openRun(id: number) {
    open.value = true
    detail.value = null
    failureMessage.value = null
    loading.value = true

    try {
      detail.value = await backtestApplication.getRun(id)
    }
    catch (error: unknown) {
      if (error instanceof BackendUnreachableError) {
        failureMessage.value = translatedText('backtest.common.unreachable')
      }
      else if (error instanceof LocalizedError) {
        failureMessage.value = error.localizedMessage
      }
      else {
        failureMessage.value = error instanceof Error
          ? new UntranslatedTextVo(error.message)
          : translatedText('backtest.runs.unknownFailure')
      }
    }
    finally {
      loading.value = false
    }
  }

  function close() {
    open.value = false
  }

  return { open, detail, loading, failureMessage, openRun, close }
}
