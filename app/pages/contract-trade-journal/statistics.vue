<script setup lang="ts">
import ContractTradeStatisticsPanel from '~/components/organisms/ContractTradeStatisticsPanel.vue'
import ContractTradeLiveComparisonPanel from '~/components/organisms/ContractTradeLiveComparisonPanel.vue'

definePageMeta({
  layout: 'console',
  consoleTitleKey: 'contractTradeJournal.pages.statistics.title',
  consoleSubtitleKey: 'contractTradeJournal.pages.statistics.subtitle',
})

const { selectedTimeZone } = useSelectedTimeZone()
const statistics = useContractTradeStatistics()

onMounted(() => {
  void statistics.loadStatistics()
  void statistics.loadTradingStrategies()
})
</script>

<template>
  <div class="contract-trade-statistics-page">
    <ContractTradeStatisticsPanel
      v-model:period="statistics.period.value"
      :statistics="statistics.statistics.value"
      :loading="statistics.loading.value"
      :failure-message="statistics.failureMessage.value"
      :period-options="statistics.periodOptions"
      :time-zone="selectedTimeZone"
    />
    <ContractTradeLiveComparisonPanel
      v-model:selected-trading-strategy-id="statistics.selectedTradingStrategyId.value"
      :trading-strategies="statistics.tradingStrategies.value"
      :comparison="statistics.comparison.value"
      :replaying="statistics.replaying.value"
      :failure-message="statistics.comparisonFailureMessage.value"
    />
  </div>
</template>

<style scoped lang="scss">
.contract-trade-statistics-page {
  display: flex;
  flex-direction: column;
  gap: spacing('lg');
}
</style>
