<script setup lang="ts">
import StrategyBotWorkbenchPage from '~/components/templates/StrategyBotWorkbenchPage.vue'

definePageMeta({
  layout: 'console',
  consoleTitleKey: 'strategyBot.pages.spotWorkbench.title',
  consoleSubtitleKey: 'strategyBot.pages.spotWorkbench.subtitle',
})

// 頁面只做接線：說出這一條路走的是「新拼一台現貨機器人」。
</script>

<template>
  <StrategyBotWorkbenchPage
    :strategy-bot-id="null"
    market-data-kind="kCandle"
  />
</template>
