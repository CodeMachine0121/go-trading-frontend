<script setup lang="ts">
import IndicatorCalculationPanel from '~/components/organisms/IndicatorCalculationPanel.vue'

definePageMeta({
  layout: 'console',
  consoleTitle: '現貨策略腳本',
  consoleSubtitle: '寫一支算式、試跑、存起來、拿一段歷史回測它。整份算式都是你的，開新的空白策略腳本時先幫你把開頭與進入點備好；算式一律送到後端沙箱執行。',
})

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
// 時區、連線燈、帳號與現貨／合約開關由 console 版型統一接線。
const {
  $indicatorCalculationApplication,
  $strategyScriptApplication,
  $strategyScriptMarketplaceApplication,
  $tradingSymbolApplication,
  $backtestApplication,
} = useNuxtApp()

// 顯示時區是跨畫面共用的畫面狀態：頁面取用它，往下傳給要說時間的元件。
const { selectedTimeZone } = useSelectedTimeZone()
</script>

<template>
  <IndicatorCalculationPanel
    :indicator-calculation-application="$indicatorCalculationApplication"
    :strategy-script-application="$strategyScriptApplication"
    :strategy-script-marketplace-application="$strategyScriptMarketplaceApplication"
    :trading-symbol-application="$tradingSymbolApplication"
    :backtest-application="$backtestApplication"
    :time-zone="selectedTimeZone"
  />
</template>
