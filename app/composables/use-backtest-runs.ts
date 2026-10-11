import { toValue, type MaybeRefOrGetter } from 'vue'
import type { BacktestApplication } from '~/application/backtest-application'
import type { BacktestRunDto } from '~/domain/models/dto/backtest-run-dto'
import type { BacktestRunListQueryDto } from '~/domain/models/dto/backtest-run-list-query-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { BacktestRunAlreadyEndedError } from '~/domain/errors/backtest-run-already-ended-error'
import { useBacktestRunFailureMessage } from '~/composables/use-backtest-run-failure-message'

/** 有排隊中或進行中的輪次時，列表每隔這麼久回頭重讀一次。 */
export const BACKTEST_RUN_POLL_INTERVAL_MILLISECONDS = 3000

/**
 * 一份「我的回測」列表：載入、剛送出的插到最上面、取消、翻下一頁，
 * 以及有輪次還沒結束時每隔幾秒自己重讀、全部結束就停、離開畫面也停。
 *
 * 範圍（哪一支腳本的、哪一份交易策略的、或全部）由呼叫端給，變了就重新載入。
 */
export function useBacktestRuns(
  backtestApplication: BacktestApplication,
  scope: MaybeRefOrGetter<BacktestRunListQueryDto>,
) {
  const { failureMessageOf } = useBacktestRunFailureMessage()

  const runs = ref<BacktestRunDto[]>([])
  const totalCount = ref(0)
  const loading = ref(false)
  const failureMessage = ref<LocalizedTextVo | null>(null)
  const query = ref<BacktestRunListQueryDto>(toValue(scope))

  const hasActiveRuns = computed(() => runs.value.some(run => run.isActive))
  const canShowMore = computed(
    () => backtestApplication.canShowMoreRuns(query.value, runs.value.length, totalCount.value))

  /** 每一次換掉清單（載入、插入剛送出的、換範圍）都往上加；回來時號碼已經不是最新的，那一次的結果就不要。 */
  let listGeneration = 0
  let pollHandle: ReturnType<typeof setTimeout> | null = null
  /** 畫面已經離開：還在路上的那一次回來之後也不再排下一次。 */
  let disposed = false

  function takePage(page: { runs: readonly BacktestRunDto[], totalCount: number }) {
    runs.value = [...page.runs]
    totalCount.value = page.totalCount
  }

  async function load() {
    listGeneration += 1
    const generation = listGeneration
    loading.value = true
    failureMessage.value = null

    try {
      const page = await backtestApplication.listRuns(query.value)
      if (generation === listGeneration) {
        takePage(page)
      }
    }
    catch (error: unknown) {
      if (generation === listGeneration) {
        failureMessage.value = failureMessageOf(error)
      }
    }
    finally {
      if (generation === listGeneration) {
        loading.value = false
      }
    }
  }

  async function showMore() {
    query.value = backtestApplication.grownQuery(query.value)
    await load()
  }

  /** 剛送出的那一筆插到最上面，不等下一次重讀——它是這個人剛按下去的東西。 */
  function prepend(run: BacktestRunDto) {
    listGeneration += 1
    const alreadyListed = runs.value.some(existing => existing.id === run.id)
    runs.value = [run, ...runs.value.filter(existing => existing.id !== run.id)]
    if (!alreadyListed) {
      totalCount.value += 1
    }
  }

  async function cancel(id: number) {
    failureMessage.value = null

    try {
      const cancelled = await backtestApplication.cancelRun(id)
      runs.value = runs.value.map(run => (run.id === id ? cancelled : run))
    }
    catch (error: unknown) {
      // 已經結束的那一筆：重讀一次，讓那一列換成它真正的結局、取消鈕也跟著消失。
      if (error instanceof BacktestRunAlreadyEndedError) {
        await load()
      }
      failureMessage.value = failureMessage.value ?? failureMessageOf(error)
    }
  }

  /** 排下一次重讀，除非沒有必要或已經排過。每一次醒來都重新問一次「還有在跑的嗎」，不是的話就不再排。 */
  function schedulePoll(): void {
    if (!import.meta.client || disposed || pollHandle !== null || !hasActiveRuns.value) {
      return
    }

    pollHandle = setTimeout(() => {
      pollHandle = null

      if (!hasActiveRuns.value) {
        return
      }

      const generation = listGeneration
      void backtestApplication.refreshRuns(query.value)
        .then((page) => {
          if (generation === listGeneration) {
            takePage(page)
            failureMessage.value = null
          }
        })
        .catch((error: unknown) => {
          if (generation === listGeneration) {
            failureMessage.value = failureMessageOf(error)
          }
        })
        .then(schedulePoll)
    }, BACKTEST_RUN_POLL_INTERVAL_MILLISECONDS)
  }

  function stopPolling(): void {
    if (pollHandle === null) {
      return
    }

    clearTimeout(pollHandle)
    pollHandle = null
  }

  watch(hasActiveRuns, schedulePoll, { immediate: true })
  watch(() => toValue(scope), (nextScope) => {
    query.value = nextScope
    void load()
  })
  onScopeDispose(() => {
    disposed = true
    stopPolling()
  })

  return {
    runs,
    totalCount,
    loading,
    failureMessage,
    canShowMore,
    load,
    showMore,
    prepend,
    cancel,
    stopPolling,
  }
}
