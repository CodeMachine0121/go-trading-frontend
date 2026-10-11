<script setup lang="ts">
import BacktestRunsPage from '~/components/templates/BacktestRunsPage.vue'

definePageMeta({
  layout: 'console',
  consoleTitleKey: 'backtest.pages.runs.title',
  consoleSubtitleKey: 'backtest.pages.runs.subtitle',
})

// 頁面只做接線：全部的回測輪次。時區、連線燈與帳號由 console 版型統一接線。
const { $backtestApplication } = useNuxtApp()
const { selectedTimeZone } = useSelectedTimeZone()
</script>

<template>
  <BacktestRunsPage
    :backtest-application="$backtestApplication"
    :time-zone="selectedTimeZone"
  />
</template>
