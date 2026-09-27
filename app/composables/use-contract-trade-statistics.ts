import type { ContractTradeJournalApplication } from '~/application/contract-trade-journal-application'
import type { TradingStrategyApplication } from '~/application/trading-strategy-application'
import type { ContractTradeStatisticsDto } from '~/domain/models/dto/contract-trade-statistics-dto'
import type { ContractTradeLiveComparisonDto } from '~/domain/models/dto/contract-trade-live-comparison-dto'
import type { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import type { ContractTradeStatisticsPeriod } from '~/domain/models/vo/contract-trade-statistics-period-vo'
import { DEFAULT_CONTRACT_TRADE_STATISTICS_PERIOD } from '~/domain/models/vo/contract-trade-statistics-period-vo'

export function useContractTradeStatistics(
  contractTradeJournalApplication: ContractTradeJournalApplication = useNuxtApp().$contractTradeJournalApplication,
  tradingStrategyApplication: TradingStrategyApplication = useNuxtApp().$tradingStrategyApplication,
) {
  const periodOptions = contractTradeJournalApplication.listStatisticsPeriods()
  const period = ref<ContractTradeStatisticsPeriod>(DEFAULT_CONTRACT_TRADE_STATISTICS_PERIOD)
  const statistics = ref<ContractTradeStatisticsDto | null>(null)
  const loading = ref(false)
  const failureMessage = ref<string | null>(null)

  const tradingStrategies = ref<TradingStrategyDto[]>([])
  const selectedTradingStrategyId = ref<number | null>(null)
  const comparison = ref<ContractTradeLiveComparisonDto | null>(null)
  const replaying = ref(false)
  const comparisonFailureMessage = ref<string | null>(null)

  async function loadStatistics(): Promise<void> {
    loading.value = true
    failureMessage.value = null

    try {
      statistics.value = await contractTradeJournalApplication.getStatistics(period.value)
    }
    catch (error: unknown) {
      statistics.value = null
      failureMessage.value = contractTradeJournalApplication.describeFailure(error).message
    }
    finally {
      loading.value = false
    }
  }

  async function loadTradingStrategies(): Promise<void> {
    try {
      tradingStrategies.value = await tradingStrategyApplication.listTradingStrategiesFollowableBy('contractKCandle')
    }
    catch (error: unknown) {
      comparisonFailureMessage.value = contractTradeJournalApplication.describeFailure(error).message
    }
  }

  async function compareWithBacktest(): Promise<void> {
    const tradingStrategyId = selectedTradingStrategyId.value
    if (tradingStrategyId === null) {
      comparison.value = null

      return
    }

    replaying.value = true
    comparisonFailureMessage.value = null

    try {
      comparison.value = await contractTradeJournalApplication.getLiveComparison(tradingStrategyId)
    }
    catch (error: unknown) {
      comparison.value = null
      comparisonFailureMessage.value = contractTradeJournalApplication.describeFailure(error).message
    }
    finally {
      replaying.value = false
    }
  }

  watch(period, () => {
    void loadStatistics()
  })

  watch(selectedTradingStrategyId, () => {
    void compareWithBacktest()
  })

  return {
    periodOptions,
    period,
    statistics,
    loading,
    failureMessage,
    tradingStrategies,
    selectedTradingStrategyId,
    comparison,
    replaying,
    comparisonFailureMessage,
    loadStatistics,
    loadTradingStrategies,
  }
}
