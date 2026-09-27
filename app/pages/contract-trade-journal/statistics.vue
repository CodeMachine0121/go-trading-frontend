<script setup lang="ts">
import ContractTradeStatisticsPanel from '~/components/organisms/ContractTradeStatisticsPanel.vue'
import ContractTradeLiveComparisonPanel from '~/components/organisms/ContractTradeLiveComparisonPanel.vue'

definePageMeta({
  layout: 'console',
  consoleTitle: '績效統計',
  consoleSubtitle: '以 R 看一段期間的成績、失誤成本，以及同一份策略的實盤 vs 回測。',
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
