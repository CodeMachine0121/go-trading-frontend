import type { SpotTradeJournalApplication } from '~/application/spot-trade-journal-application'
import type { TradingStrategyApplication } from '~/application/trading-strategy-application'
import type { SpotTradeStatisticsDto } from '~/domain/models/dto/spot-trade-statistics-dto'
import type { SpotTradeLiveComparisonDto } from '~/domain/models/dto/spot-trade-live-comparison-dto'
import type { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import type { TradeStatisticsPeriod } from '~/domain/models/vo/trade-statistics-period-vo'
import { DEFAULT_TRADE_STATISTICS_PERIOD } from '~/domain/models/vo/trade-statistics-period-vo'

export function useSpotTradeStatistics(
  spotTradeJournalApplication: SpotTradeJournalApplication = useNuxtApp().$spotTradeJournalApplication,
  tradingStrategyApplication: TradingStrategyApplication = useNuxtApp().$tradingStrategyApplication,
) {
  const periodOptions = spotTradeJournalApplication.listStatisticsPeriods()
  const period = ref<TradeStatisticsPeriod>(DEFAULT_TRADE_STATISTICS_PERIOD)
  const statistics = ref<SpotTradeStatisticsDto | null>(null)
  const loading = ref(false)
  const failureMessage = ref<string | null>(null)

  const tradingStrategies = ref<TradingStrategyDto[]>([])
  const selectedTradingStrategyId = ref<number | null>(null)
  const comparison = ref<SpotTradeLiveComparisonDto | null>(null)
  const replaying = ref(false)
  const comparisonFailureMessage = ref<string | null>(null)

  async function loadStatistics(): Promise<void> {
    loading.value = true
    failureMessage.value = null

    try {
      statistics.value = await spotTradeJournalApplication.getStatistics(period.value)
    }
    catch (error: unknown) {
      statistics.value = null
      failureMessage.value = spotTradeJournalApplication.describeFailure(error).message
    }
    finally {
      loading.value = false
    }
  }

  async function loadTradingStrategies(): Promise<void> {
    try {
      tradingStrategies.value = await tradingStrategyApplication.listTradingStrategiesFollowableBy('kCandle')
    }
    catch (error: unknown) {
      comparisonFailureMessage.value = spotTradeJournalApplication.describeFailure(error).message
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
      const replayed = await spotTradeJournalApplication.getLiveComparison(tradingStrategyId)
      if (selectedTradingStrategyId.value === tradingStrategyId) {
        comparison.value = replayed
      }
    }
    catch (error: unknown) {
      if (selectedTradingStrategyId.value === tradingStrategyId) {
        comparison.value = null
        comparisonFailureMessage.value = spotTradeJournalApplication.describeFailure(error).message
      }
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
