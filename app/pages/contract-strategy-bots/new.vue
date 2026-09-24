<script setup lang="ts">
import StrategyBotWorkbenchPage from '~/components/templates/StrategyBotWorkbenchPage.vue'

// 頁面只做接線：說出這一條路走的是「新拼一台合約機器人」。
</script>

<template>
  <StrategyBotWorkbenchPage
    :strategy-bot-id="null"
    market-data-kind="contractKCandle"
  />
</template>
