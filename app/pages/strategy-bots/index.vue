<script setup lang="ts">
import StrategyBotListPage from '~/components/templates/StrategyBotListPage.vue'

definePageMeta({
  layout: 'console',
  consoleTitleKey: 'strategyBot.pages.spotList.title',
  consoleSubtitleKey: 'strategyBot.pages.spotList.subtitle',
})

// 頁面只做接線：這一條路列的是現貨機器人。時區、連線燈與帳號由 console 版型統一接線。
</script>

<template>
  <StrategyBotListPage market-data-kind="kCandle" />
</template>
