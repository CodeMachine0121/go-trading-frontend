<script setup lang="ts">
import SpotTradeListPanel from '~/components/organisms/SpotTradeListPanel.vue'

definePageMeta({
  layout: 'console',
  consoleTitle: '現貨交易日誌',
  consoleSubtitle: '台股與加密貨幣現貨：買進、賣出之後記下來；損益、報酬率與統計由交易服務算好。',
})

const journal = useSpotTradeJournal()

onMounted(() => {
  void journal.loadTrades()
})
</script>

<template>
  <SpotTradeListPanel
    v-model:status-filter="journal.statusFilter.value"
    v-model:source-filter="journal.sourceFilter.value"
    v-model:market-filter="journal.marketFilter.value"
    v-model:symbol-filter="journal.symbolFilter.value"
    :list="journal.list.value"
    :loading="journal.loading.value"
    :failure-message="journal.failureMessage.value"
    @retry="journal.loadTrades"
    @show-pending-review="journal.showPendingReview"
  />
</template>
