<script setup lang="ts">
import TradingStrategyWorkbenchPage from '~/components/templates/TradingStrategyWorkbenchPage.vue'

// 頁面只做接線：把網址上那個號碼交給工作台。
//
// 解析不出號碼時當作**沒有那一份**，而不是當作新增：`/trading-strategies/abc` 是一條
// 打錯的路，而把它變成一張空白的新表單，會讓使用者以為自己在改某一份。
const route = useRoute()
const tradingStrategyId = computed(() => {
  const parsed = Number(route.params.id)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
})
</script>

<template>
  <TradingStrategyWorkbenchPage :trading-strategy-id="tradingStrategyId" />
</template>
