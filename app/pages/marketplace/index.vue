<script setup lang="ts">
import StrategyScriptMarketplacePanel from '~/components/organisms/StrategyScriptMarketplacePanel.vue'

definePageMeta({
  layout: 'console',
  consoleTitle: 'Marketplace',
  consoleSubtitle: '大家分享出來的策略腳本。看得到它算什麼、有哪些旋鈕，看不到它怎麼算；加入之後就出現在你挑策略腳本的地方。',
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
