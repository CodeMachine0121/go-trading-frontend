<script setup lang="ts">
import KCandleContractSearchPanel from '~/components/organisms/KCandleContractSearchPanel.vue'

definePageMeta({
  layout: 'console',
  consoleTitleKey: 'marketData.pages.contractKCandles.title',
  consoleSubtitleKey: 'marketData.pages.contractKCandles.subtitle',
})

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
// 時區、連線燈、帳號與現貨／合約開關由 console 版型統一接線。
const { $kCandleApplication, $tradingSymbolApplication } = useNuxtApp()

// 顯示時區是跨畫面共用的畫面狀態：頁面取用它，往下傳給要說時間的元件。
const { selectedTimeZone } = useSelectedTimeZone()
</script>

<template>
  <KCandleContractSearchPanel
    :k-candle-application="$kCandleApplication"
    :trading-symbol-application="$tradingSymbolApplication"
    :time-zone="selectedTimeZone"
  />
</template>
