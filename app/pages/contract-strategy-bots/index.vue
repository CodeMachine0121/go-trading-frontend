<script setup lang="ts">
import StrategyBotListPage from '~/components/templates/StrategyBotListPage.vue'

definePageMeta({
  layout: 'console',
  consoleTitle: '合約策略機器人',
  consoleSubtitle: '挑一份合約交易策略、盯一個合約追蹤名單上的永續合約。它照交易策略的交易模式告訴你該做多、做空還是平倉，並依你的槓桿建議保證金與止損止盈。',
})

// 頁面只做接線：這一條路列的是合約機器人。時區、連線燈與帳號由 console 版型統一接線。
</script>

<template>
  <StrategyBotListPage market-data-kind="contractKCandle" />
</template>
