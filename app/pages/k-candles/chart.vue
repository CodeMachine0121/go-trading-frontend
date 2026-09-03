<script setup lang="ts">
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import TimeZoneField from '~/components/molecules/TimeZoneField.vue'
import KCandleChartPanel from '~/components/organisms/KCandleChartPanel.vue'

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
const { $kCandleChartApplication, $tradingSymbolApplication } = useNuxtApp()

// 顯示時區是跨畫面共用的畫面狀態：頁面取用它，往下傳給要說時間的元件。
const { selectableTimeZones, selectedTimeZone, selectTimeZone } = useSelectedTimeZone()
</script>

<template>
  <ConsoleLayout
    title="K 線圖表"
    subtitle="拉遠拉近就是在選要看多長；每根涵蓋多久會跟著換，時間一律照頂欄選定的時區呈現。"
    width="wide"
  >
    <template #timezone>
      <TimeZoneField
        :model-value="selectedTimeZone.identifier"
        :selectable-time-zones="selectableTimeZones"
        @update:model-value="selectTimeZone"
      />
    </template>

    <KCandleChartPanel
      :k-candle-chart-application="$kCandleChartApplication"
      :trading-symbol-application="$tradingSymbolApplication"
      :time-zone="selectedTimeZone"
    />
  </ConsoleLayout>
</template>
