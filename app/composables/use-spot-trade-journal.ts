import type { SpotTradeJournalApplication } from '~/application/spot-trade-journal-application'
import type { SpotTradeListDto } from '~/domain/models/dto/spot-trade-list-dto'
import { SpotTradeListFilterDto } from '~/domain/models/dto/spot-trade-list-filter-dto'
import type { TradeStatusFilter } from '~/domain/models/vo/trade-status-filter-vo'
import type { TradeSourceFilter } from '~/domain/models/vo/trade-source-filter-vo'
import type { SpotTradeMarketFilter } from '~/domain/models/vo/spot-trade-market-filter-vo'

export function useSpotTradeJournal(
  spotTradeJournalApplication: SpotTradeJournalApplication = useNuxtApp().$spotTradeJournalApplication,
) {
  const list = ref<SpotTradeListDto | null>(null)
  const loading = ref(false)
  const failureMessage = ref<string | null>(null)
  const statusFilter = ref<TradeStatusFilter>('all')
  const sourceFilter = ref<TradeSourceFilter>('all')
  const marketFilter = ref<SpotTradeMarketFilter>('all')
  const symbolFilter = ref('')

  async function loadTrades(): Promise<void> {
    loading.value = true
    failureMessage.value = null

    try {
      list.value = await spotTradeJournalApplication.listTrades(new SpotTradeListFilterDto(
        statusFilter.value, sourceFilter.value, marketFilter.value, symbolFilter.value))
    }
    catch (error: unknown) {
      list.value = null
      failureMessage.value = spotTradeJournalApplication.describeFailure(error).message
    }
    finally {
      loading.value = false
    }
  }

  function showPendingReview(): void {
    statusFilter.value = 'closed'
  }

  watch([statusFilter, sourceFilter, marketFilter, symbolFilter], () => {
    void loadTrades()
  })

  return {
    list,
    loading,
    failureMessage,
    statusFilter,
    sourceFilter,
    marketFilter,
    symbolFilter,
    loadTrades,
    showPendingReview,
  }
}
