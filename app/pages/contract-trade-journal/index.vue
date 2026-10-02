<script setup lang="ts">
import ContractTradeListPanel from '~/components/organisms/ContractTradeListPanel.vue'

definePageMeta({
  layout: 'console',
  consoleTitleKey: 'contractTradeJournal.pages.index.title',
  consoleSubtitleKey: 'contractTradeJournal.pages.index.subtitle',
})

const journal = useContractTradeJournal()

onMounted(() => {
  void journal.loadTrades()
})
</script>

<template>
  <ContractTradeListPanel
    v-model:status-filter="journal.statusFilter.value"
    v-model:source-filter="journal.sourceFilter.value"
    v-model:symbol-filter="journal.symbolFilter.value"
    :list="journal.list.value"
    :loading="journal.loading.value"
    :failure-message="journal.failureMessage.value"
    @retry="journal.loadTrades"
    @show-pending-review="journal.showPendingReview"
  />
</template>
