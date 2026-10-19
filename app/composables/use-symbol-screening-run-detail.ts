import type { SymbolScreeningApplication } from '~/application/symbol-screening-application'
import type { SymbolScreeningRunDetailDto } from '~/domain/models/dto/symbol-screening-run-detail-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { SYMBOL_SCREENING_POLL_INTERVAL_MILLISECONDS } from '~/composables/use-symbol-screening-runs'
import { useSymbolScreeningFailureMessage } from '~/composables/use-symbol-screening-failure-message'

export function useSymbolScreeningRunDetail(symbolScreeningApplication: SymbolScreeningApplication) {
  const { failureMessageOf } = useSymbolScreeningFailureMessage()

  const open = ref(false)
  const detail = ref<SymbolScreeningRunDetailDto | null>(null)
  const loading = ref(false)
  const failureMessage = ref<LocalizedTextVo | null>(null)

  // Each open, refresh or close bumps this so a late reply about an older view is dropped.
  let viewGeneration = 0
  let openedId: number | null = null
  let pollHandle: ReturnType<typeof setTimeout> | null = null

  function stopPolling() {
    if (pollHandle !== null) {
      clearTimeout(pollHandle)
      pollHandle = null
    }
  }

  async function read(generation: number, inBackground: boolean) {
    if (openedId === null) {
      return
    }

    try {
      const fetched = inBackground
        ? await symbolScreeningApplication.refreshRun(openedId)
        : await symbolScreeningApplication.getRun(openedId)
      if (generation === viewGeneration) {
        detail.value = fetched
        failureMessage.value = null
      }
    }
    catch (error: unknown) {
      if (generation === viewGeneration) {
        failureMessage.value = failureMessageOf(error)
      }
    }
    finally {
      if (generation === viewGeneration) {
        loading.value = false
      }
    }

    if (generation !== viewGeneration || detail.value === null || !detail.value.run.isActive) {
      return
    }

    pollHandle = setTimeout(() => {
      pollHandle = null
      void read(generation, true)
    }, SYMBOL_SCREENING_POLL_INTERVAL_MILLISECONDS)
  }

  async function openRun(id: number) {
    stopPolling()
    viewGeneration += 1
    openedId = id
    open.value = true
    detail.value = null
    failureMessage.value = null
    loading.value = true

    await read(viewGeneration, false)
  }

  async function refresh() {
    stopPolling()
    viewGeneration += 1

    await read(viewGeneration, false)
  }

  function close() {
    stopPolling()
    viewGeneration += 1
    openedId = null
    open.value = false
    loading.value = false
  }

  onScopeDispose(close)

  return { open, detail, loading, failureMessage, openRun, refresh, close }
}
