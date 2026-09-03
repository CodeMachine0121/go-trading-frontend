<script setup lang="ts">
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import TimeZoneField from '~/components/molecules/TimeZoneField.vue'
import IndicatorCalculationPanel from '~/components/organisms/IndicatorCalculationPanel.vue'

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
const { $indicatorCalculationApplication, $tradingSymbolApplication } = useNuxtApp()

// 顯示時區是跨畫面共用的畫面狀態：頁面取用它，往下傳給要說時間的元件。
const { selectableTimeZones, selectedTimeZone, selectTimeZone } = useSelectedTimeZone()
</script>

<template>
  <ConsoleLayout
    title="指標計算"
    subtitle="只寫進入點裡面那幾行，外框由畫面依指標值種類備妥；算式一律送到後端沙箱執行。"
    width="wide"
  >
    <template #timezone>
      <TimeZoneField
        :model-value="selectedTimeZone.identifier"
        :selectable-time-zones="selectableTimeZones"
        @update:model-value="selectTimeZone"
      />
    </template>

    <IndicatorCalculationPanel
      :indicator-calculation-application="$indicatorCalculationApplication"
      :trading-symbol-application="$tradingSymbolApplication"
    />
  </ConsoleLayout>
</template>
