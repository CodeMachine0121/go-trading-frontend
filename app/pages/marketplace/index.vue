<script setup lang="ts">
import StrategyScriptMarketplacePanel from '~/components/organisms/StrategyScriptMarketplacePanel.vue'

definePageMeta({
  layout: 'console',
  consoleTitleKey: 'strategyScript.pages.marketplace.title',
  consoleSubtitleKey: 'strategyScript.pages.marketplace.subtitle',
})

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
// 時區、連線燈與帳號由 console 版型統一接線。
const { $strategyScriptMarketplaceApplication } = useNuxtApp()
</script>

<template>
  <StrategyScriptMarketplacePanel
    :strategy-script-marketplace-application="$strategyScriptMarketplaceApplication"
  />
</template>
