<script setup lang="ts">
import TradingStrategyListPanel from '~/components/organisms/TradingStrategyListPanel.vue'

definePageMeta({
  layout: 'console',
  consoleTitle: '交易策略',
  consoleSubtitle: '把幾支策略腳本的訊號拼成兩個條件：什麼情況算買、什麼情況算賣。拼好的一份可以讓好幾台機器人一起用，改一次就是改全部。',
})

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
// 連線燈、帳號與現貨／合約開關由 console 版型統一接線。
const { $tradingStrategyApplication } = useNuxtApp()
</script>

<template>
  <TradingStrategyListPanel :trading-strategy-application="$tradingStrategyApplication" />
</template>
