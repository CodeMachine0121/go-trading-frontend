<script setup lang="ts">
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import KCandleSearchPanel from '~/components/organisms/KCandleSearchPanel.vue'

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
const { $kCandleApplication } = useNuxtApp()
</script>

<template>
  <ConsoleLayout title="K 線瀏覽">
    <KCandleSearchPanel :k-candle-application="$kCandleApplication" />
  </ConsoleLayout>
</template>
