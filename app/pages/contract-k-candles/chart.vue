<script setup lang="ts">
import KCandleContractChartPanel from '~/components/organisms/KCandleContractChartPanel.vue'
import MarketSwitch from '~/components/molecules/MarketSwitch.vue'

definePageMeta({
  layout: 'chart-workspace',
  consoleTitleKey: 'marketData.pages.contractKCandleChart.title',
  consoleSubtitleKey: 'marketData.pages.contractKCandleChart.subtitle',
})

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
// 時區、連線燈、帳號由看盤工作區版型收進主選單；現貨／合約開關放進工作區的上方細邊。
const {
  $kCandleChartApplication,
  $tradingSymbolApplication,
  $liveKCandleContractApplication,
  $chartDrawingApplication,
  $marketCounterpartApplication,
} = useNuxtApp()
const route = useRoute()

// 顯示時區是跨畫面共用的畫面狀態：頁面取用它，往下傳給要說時間的元件。
const { selectedTimeZone } = useSelectedTimeZone()

const { openMenu } = useChartWorkspaceMenu()

const counterpart = computed(() => $marketCounterpartApplication.describeCounterpart(route.path))
</script>

<template>
  <KCandleContractChartPanel
    :k-candle-chart-application="$kCandleChartApplication"
    :trading-symbol-application="$tradingSymbolApplication"
    :chart-indicator-application="$chartIndicatorApplication"
    :strategy-script-application="$strategyScriptApplication"
    :live-k-candle-contract-application="$liveKCandleContractApplication"
    :chart-drawing-application="$chartDrawingApplication"
    :time-zone="selectedTimeZone"
    @open-menu="openMenu"
  >
    <template #market>
      <MarketSwitch
        :counterpart="counterpart"
        @navigate="path => navigateTo(path)"
      />
    </template>
  </KCandleContractChartPanel>
</template>
