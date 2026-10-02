<script setup lang="ts">
import SpotTradeListPanel from '~/components/organisms/SpotTradeListPanel.vue'

definePageMeta({
  layout: 'console',
  consoleTitleKey: 'tradeJournal.pages.spotList.title',
  consoleSubtitleKey: 'tradeJournal.pages.spotList.subtitle',
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
