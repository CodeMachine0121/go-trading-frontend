<script setup lang="ts">
import KCandleSearchPanel from '~/components/organisms/KCandleSearchPanel.vue'

definePageMeta({
  layout: 'console',
  consoleTitle: '現貨 K 線瀏覽',
  consoleSubtitle: '指定交易標的與開始時間查詢，查到送出當下為止，結果由新到舊列出；時間一律照頂欄選定的時區呈現。',
})

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
// 時區、連線燈、帳號與現貨／合約開關由 console 版型統一接線。
const { $kCandleApplication, $tradingSymbolApplication } = useNuxtApp()

// 顯示時區是跨畫面共用的畫面狀態：頁面取用它，往下傳給要說時間的元件。
const { selectedTimeZone } = useSelectedTimeZone()

// 現在這個寬度代表什麼。這一頁用到的是「維護表單從哪裡出來」——
// 寬螢幕上它是表格旁的一張卡，手機上它從底部拉出來。
const { layoutDensity } = useLayoutDensity()
</script>

<template>
  <KCandleSearchPanel
    :k-candle-application="$kCandleApplication"
    :trading-symbol-application="$tradingSymbolApplication"
    :time-zone="selectedTimeZone"
    :layout-density="layoutDensity"
  />
</template>
