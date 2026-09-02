<script setup lang="ts">
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import IndicatorCalculationPanel from '~/components/organisms/IndicatorCalculationPanel.vue'

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
const { $indicatorCalculationApplication } = useNuxtApp()
</script>

<template>
  <ConsoleLayout
    title="指標計算"
    subtitle="只寫進入點裡面那幾行，外框由畫面依指標值種類備妥；算式一律送到後端沙箱執行。"
    width="wide"
  >
    <IndicatorCalculationPanel
      :indicator-calculation-application="$indicatorCalculationApplication"
    />
  </ConsoleLayout>
</template>
