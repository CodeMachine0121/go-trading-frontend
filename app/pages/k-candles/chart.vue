<script setup lang="ts">
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import KCandleChartPanel from '~/components/organisms/KCandleChartPanel.vue'

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
const { $kCandleChartApplication, $tradingSymbolApplication } = useNuxtApp()
</script>

<template>
  <ConsoleLayout
    title="K 線圖表"
    subtitle="拉遠拉近就是在選要看多長；每根涵蓋多久會跟著換，時間一律為世界標準時間。"
    width="wide"
  >
    <KCandleChartPanel
      :k-candle-chart-application="$kCandleChartApplication"
      :trading-symbol-application="$tradingSymbolApplication"
    />
  </ConsoleLayout>
</template>
