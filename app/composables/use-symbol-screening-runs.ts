import type { SymbolScreeningApplication } from '~/application/symbol-screening-application'
import type { SymbolScreeningRunDto } from '~/domain/models/dto/symbol-screening-run-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { SymbolScreeningRunAlreadyEndedError } from '~/domain/errors/symbol-screening-run-already-ended-error'
import { useSymbolScreeningFailureMessage } from '~/composables/use-symbol-screening-failure-message'

export const SYMBOL_SCREENING_POLL_INTERVAL_MILLISECONDS = 3000

export function useSymbolScreeningRuns(symbolScreeningApplication: SymbolScreeningApplication) {
  const { failureMessageOf } = useSymbolScreeningFailureMessage()

  const runs = ref<SymbolScreeningRunDto[]>([])
  const loading = ref(false)
  const failureMessage = ref<LocalizedTextVo | null>(null)

  const hasActiveRuns = computed(() => runs.value.some(run => run.isActive))

  // A reply from before the latest replacement of the list must not overwrite it.
  let listGeneration = 0
  let pollHandle: ReturnType<typeof setTimeout> | null = null
  let disposed = false

  async function load() {
    listGeneration += 1
    const generation = listGeneration
    loading.value = true
    failureMessage.value = null

    try {
      const loaded = await symbolScreeningApplication.listRuns()
      if (generation === listGeneration) {
        runs.value = loaded
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

  function prepend(run: SymbolScreeningRunDto) {
    listGeneration += 1
    loading.value = false
    runs.value = [run, ...runs.value.filter(existing => existing.id !== run.id)]
  }

  function replace(run: SymbolScreeningRunDto) {
    runs.value = runs.value.map(existing => (existing.id === run.id ? run : existing))
  }

  async function cancel(id: number) {
    failureMessage.value = null

    try {
      replace(await symbolScreeningApplication.cancelRun(id))
    }
    catch (error: unknown) {
      if (error instanceof SymbolScreeningRunAlreadyEndedError) {
        await load()
      }
      failureMessage.value = failureMessageOf(error)
    }
  }

  function schedulePoll(): void {
    if (disposed || pollHandle !== null || !hasActiveRuns.value) {
      return
    }

    pollHandle = setTimeout(() => {
      pollHandle = null
      const generation = listGeneration

      void symbolScreeningApplication.refreshRuns()
        .then((refreshed) => {
          if (generation === listGeneration) {
            runs.value = refreshed
          }
        })
        .catch((error: unknown) => {
          if (generation === listGeneration) {
            failureMessage.value = failureMessageOf(error)
          }
        })
        .then(schedulePoll)
    }, SYMBOL_SCREENING_POLL_INTERVAL_MILLISECONDS)
  }

  watch(hasActiveRuns, schedulePoll, { immediate: true })
  onScopeDispose(() => {
    disposed = true
    if (pollHandle !== null) {
      clearTimeout(pollHandle)
      pollHandle = null
    }
  })

  return { runs, loading, failureMessage, load, prepend, replace, cancel }
}
