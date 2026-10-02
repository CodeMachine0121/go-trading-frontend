<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IndicatorCalculationPanel from '~/components/organisms/IndicatorCalculationPanel.vue'

definePageMeta({
  layout: 'console',
  consoleTitleKey: 'strategyScript.pages.contractStrategyScripts.title',
  consoleSubtitleKey: 'strategyScript.pages.contractStrategyScripts.subtitle',
})

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
// 這一頁的身分是「合約行情」：同一塊工作區，寫、存、算的都是吃合約行情格的策略腳本。
// 時區、連線燈、帳號與現貨／合約開關由 console 版型統一接線。
const {
  $indicatorCalculationApplication,
  $strategyScriptApplication,
  $tradingSymbolApplication,
  $backtestApplication,
} = useNuxtApp()

// 顯示時區是跨畫面共用的畫面狀態：頁面取用它，往下傳給要說時間的元件。
const { selectedTimeZone } = useSelectedTimeZone()

const { t } = useI18n()

const panel = ref<InstanceType<typeof IndicatorCalculationPanel> | null>(null)

// 寫到一半想離開（包括按現貨／合約開關）就先問過；什麼都沒改時不問。
onBeforeRouteLeave(() => panel.value?.hasUnsavedDraft() === true
  ? window.confirm(t('strategyScript.pages.unsavedLeaveConfirmation'))
  : true)
</script>

<template>
  <IndicatorCalculationPanel
    ref="panel"
    :indicator-calculation-application="$indicatorCalculationApplication"
    :strategy-script-application="$strategyScriptApplication"
    :trading-symbol-application="$tradingSymbolApplication"
    :backtest-application="$backtestApplication"
    :time-zone="selectedTimeZone"
    market-data-kind="contractKCandle"
  />
</template>
