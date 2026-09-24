<script setup lang="ts">
import StrategyBotWorkbenchPage from '~/components/templates/StrategyBotWorkbenchPage.vue'

definePageMeta({
  layout: 'console',
  consoleTitle: '合約策略機器人',
  consoleSubtitle: '挑一份交易策略，說它盯哪個市場、多久看一次。規則本身在交易策略那一頁調——同一份可以讓好幾台機器人一起用。',
})

// 頁面只做接線：把網址上那個號碼交給工作台。
//
// 解析不出號碼時當作**沒有那一台**，而不是當作新增：`/contract-strategy-bots/abc` 是一條
// 打錯的路，而把它變成一張空白的新表單，會讓使用者以為自己在改某一台。
const route = useRoute()
const strategyBotId = computed(() => {
  const parsed = Number(route.params.id)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
})
</script>

<template>
  <StrategyBotWorkbenchPage
    :strategy-bot-id="strategyBotId"
    market-data-kind="contractKCandle"
  />
</template>
