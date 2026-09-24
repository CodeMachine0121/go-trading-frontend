<script setup lang="ts">
import StrategyBotWorkbenchPage from '~/components/templates/StrategyBotWorkbenchPage.vue'

definePageMeta({
  layout: 'console',
  consoleTitle: '合約策略機器人',
  consoleSubtitle: '挑一份交易策略，說它盯哪個市場、多久看一次。規則本身在交易策略那一頁調——同一份可以讓好幾台機器人一起用。',
})

// 頁面只做接線：說出這一條路走的是「新拼一台合約機器人」。
</script>

<template>
  <StrategyBotWorkbenchPage
    :strategy-bot-id="null"
    market-data-kind="contractKCandle"
  />
</template>
