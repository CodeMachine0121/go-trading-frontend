<script setup lang="ts">
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import KCandleSearchPanel from '~/components/organisms/KCandleSearchPanel.vue'

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
const { $kCandleApplication, $tradingSymbolApplication } = useNuxtApp()
</script>

<template>
  <ConsoleLayout
    title="K 線瀏覽"
    subtitle="指定交易標的與時間區間查詢，結果由新到舊列出；時間一律為世界標準時間。"
    width="wide"
  >
    <KCandleSearchPanel
      :k-candle-application="$kCandleApplication"
      :trading-symbol-application="$tradingSymbolApplication"
    />
  </ConsoleLayout>
</template>
