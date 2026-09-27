<script setup lang="ts">
import ContractTradeListPanel from '~/components/organisms/ContractTradeListPanel.vue'

definePageMeta({
  layout: 'console',
  consoleTitle: '合約交易日誌',
  consoleSubtitle: '收到信號、在交易所下單之後，把這筆交易記下來；損益、R 與統計由交易服務算好。',
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
