<script setup lang="ts">
import TradingStrategyListPanel from '~/components/organisms/TradingStrategyListPanel.vue'

definePageMeta({
  layout: 'console',
  consoleTitleKey: 'tradingStrategy.pages.list.title',
  consoleSubtitleKey: 'tradingStrategy.pages.list.subtitle',
})

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
// 連線燈、帳號與現貨／合約開關由 console 版型統一接線。
const { $tradingStrategyApplication } = useNuxtApp()
</script>

<template>
  <TradingStrategyListPanel :trading-strategy-application="$tradingStrategyApplication" />
</template>
