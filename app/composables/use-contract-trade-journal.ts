import type { ContractTradeListDto } from '~/domain/models/dto/contract-trade-list-dto'
import { ContractTradeListFilterDto } from '~/domain/models/dto/contract-trade-list-filter-dto'
import type { TradeStatusFilter } from '~/domain/models/vo/trade-status-filter-vo'
import type { TradeSourceFilter } from '~/domain/models/vo/trade-source-filter-vo'

export function useContractTradeJournal(
  contractTradeJournalApplication = useNuxtApp().$contractTradeJournalApplication,
) {
  const list = ref<ContractTradeListDto | null>(null)
  const loading = ref(false)
  const failureMessage = ref<string | null>(null)
  const statusFilter = ref<TradeStatusFilter>('all')
  const sourceFilter = ref<TradeSourceFilter>('all')
  const symbolFilter = ref('')

  async function loadTrades(): Promise<void> {
    loading.value = true
    failureMessage.value = null

    try {
      list.value = await contractTradeJournalApplication.listTrades(
        new ContractTradeListFilterDto(statusFilter.value, sourceFilter.value, symbolFilter.value))
    }
    catch (error: unknown) {
      list.value = null
      failureMessage.value = contractTradeJournalApplication.describeFailure(error).message
    }
    finally {
      loading.value = false
    }
  }

  function showPendingReview(): void {
    statusFilter.value = 'closed'
  }

  watch([statusFilter, sourceFilter, symbolFilter], () => {
    void loadTrades()
  })

  return {
    list,
    loading,
    failureMessage,
    statusFilter,
    sourceFilter,
    symbolFilter,
    loadTrades,
    showPendingReview,
  }
}
