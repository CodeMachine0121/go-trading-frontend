<script setup lang="ts">
import KCandleContractChartPanel from '~/components/organisms/KCandleContractChartPanel.vue'

definePageMeta({
  layout: 'console',
  consoleTitle: '合約 K 線圖表',
  consoleSubtitle: '永續合約的成交價走勢。拉遠拉近就是在選要看多長；每根涵蓋多久會跟著換，時間一律照頂欄選定的時區呈現。',
})

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
// 時區、連線燈、帳號與現貨／合約開關由 console 版型統一接線。
const { $kCandleChartApplication, $tradingSymbolApplication, $liveKCandleContractApplication } = useNuxtApp()

// 顯示時區是跨畫面共用的畫面狀態：頁面取用它，往下傳給要說時間的元件。
const { selectedTimeZone } = useSelectedTimeZone()

// 現在這個寬度代表什麼。這一頁用到的是「控制項一開始收不收」——
// 手機上這一頁是為了看圖而存在的，那塊高度先讓給圖。
const { layoutDensity } = useLayoutDensity()
</script>

<template>
  <KCandleContractChartPanel
    :k-candle-chart-application="$kCandleChartApplication"
    :trading-symbol-application="$tradingSymbolApplication"
    :live-k-candle-contract-application="$liveKCandleContractApplication"
    :time-zone="selectedTimeZone"
    :layout-density="layoutDensity"
  />
</template>
