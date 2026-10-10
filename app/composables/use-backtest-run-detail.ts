import type { BacktestApplication } from '~/application/backtest-application'
import type { BacktestRunDetailDto } from '~/domain/models/dto/backtest-run-detail-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { useBacktestRunFailureMessage } from '~/composables/use-backtest-run-failure-message'

/** 點開的那一筆輪次：取明細、開著或關著、讀不到時說原因。列表頁與兩個回測區塊共用。 */
export function useBacktestRunDetail(backtestApplication: BacktestApplication) {
  const { failureMessageOf } = useBacktestRunFailureMessage()

  const open = ref(false)
  const detail = ref<BacktestRunDetailDto | null>(null)
  const loading = ref(false)
  const failureMessage = ref<LocalizedTextVo | null>(null)

  /** 最後點開的是哪一筆：先點的那一筆比較晚回來時，不能蓋到後點的那一筆上。 */
  let openingId: number | null = null

  async function openRun(id: number) {
    openingId = id
    open.value = true
    detail.value = null
    failureMessage.value = null
    loading.value = true

    try {
      const opened = await backtestApplication.getRun(id)
      if (openingId === id) {
        detail.value = opened
      }
    }
    catch (error: unknown) {
      if (openingId === id) {
        failureMessage.value = failureMessageOf(error)
      }
    }
    finally {
      if (openingId === id) {
        loading.value = false
      }
    }
  }

  function close() {
    open.value = false
  }

  return { open, detail, loading, failureMessage, openRun, close }
}
