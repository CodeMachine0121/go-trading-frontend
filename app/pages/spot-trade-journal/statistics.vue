<script setup lang="ts">
import SpotTradeStatisticsPanel from '~/components/organisms/SpotTradeStatisticsPanel.vue'
import SpotTradeLiveComparisonPanel from '~/components/organisms/SpotTradeLiveComparisonPanel.vue'

definePageMeta({
  layout: 'console',
  consoleTitleKey: 'tradeJournal.pages.spotStatistics.title',
  consoleSubtitleKey: 'tradeJournal.pages.spotStatistics.subtitle',
})

const { selectedTimeZone } = useSelectedTimeZone()
const statistics = useSpotTradeStatistics()

onMounted(() => {
  void statistics.loadStatistics()
  void statistics.loadTradingStrategies()
})
</script>

<template>
  <div class="spot-trade-statistics-page">
    <SpotTradeStatisticsPanel
      v-model:period="statistics.period.value"
      :statistics="statistics.statistics.value"
      :loading="statistics.loading.value"
      :failure-message="statistics.failureMessage.value"
      :period-options="statistics.periodOptions"
      :time-zone="selectedTimeZone"
    />
    <SpotTradeLiveComparisonPanel
      v-model:selected-trading-strategy-id="statistics.selectedTradingStrategyId.value"
      :trading-strategies="statistics.tradingStrategies.value"
      :comparison="statistics.comparison.value"
      :replaying="statistics.replaying.value"
      :failure-message="statistics.comparisonFailureMessage.value"
    />
  </div>
</template>

<style scoped lang="scss">
.spot-trade-statistics-page {
  display: flex;
  flex-direction: column;
  gap: spacing('lg');
}
</style>
