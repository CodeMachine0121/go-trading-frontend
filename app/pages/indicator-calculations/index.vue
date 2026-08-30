<script setup lang="ts">
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import IndicatorCalculationPanel from '~/components/organisms/IndicatorCalculationPanel.vue'

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
const { $indicatorCalculationApplication } = useNuxtApp()
</script>

<template>
  <ConsoleLayout title="指標計算">
    <IndicatorCalculationPanel
      :indicator-calculation-application="$indicatorCalculationApplication"
    />
  </ConsoleLayout>
</template>
