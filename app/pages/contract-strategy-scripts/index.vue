<script setup lang="ts">
import IndicatorCalculationPanel from '~/components/organisms/IndicatorCalculationPanel.vue'

definePageMeta({
  layout: 'console',
  consoleTitle: '合約策略腳本',
  consoleSubtitle: '寫一支吃永續合約行情的算式：每一格除了成交價，還帶著標記價格、資金費率與持倉統計。試跑、存起來，並在逐倉合約帳戶上回測。算式一律送到後端沙箱執行。',
})

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
// 這一頁的身分是「合約行情」：同一塊工作區，寫、存、算的都是吃合約行情格的策略腳本。
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

const panel = ref<InstanceType<typeof IndicatorCalculationPanel> | null>(null)

// 寫到一半想離開（包括按現貨／合約開關）就先問過；什麼都沒改時不問。
onBeforeRouteLeave(() => panel.value?.hasUnsavedDraft() === true
  ? window.confirm('這一頁改過的東西還沒存，確定要離開嗎？')
  : true)
</script>

<template>
  <IndicatorCalculationPanel
    ref="panel"
    :indicator-calculation-application="$indicatorCalculationApplication"
    :strategy-script-application="$strategyScriptApplication"
    :strategy-script-marketplace-application="$strategyScriptMarketplaceApplication"
    :trading-symbol-application="$tradingSymbolApplication"
    :backtest-application="$backtestApplication"
    :time-zone="selectedTimeZone"
    market-data-kind="contractKCandle"
  />
</template>
