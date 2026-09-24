<script setup lang="ts">
import StrategyBotListPage from '~/components/templates/StrategyBotListPage.vue'

definePageMeta({
  layout: 'console',
  consoleTitle: '現貨策略機器人',
  consoleSubtitle: '挑一份 K 線交易策略、盯一個現貨標的。按下啟動之後你就可以離開——它每隔幾分鐘自己看一次，訊號變了才傳訊息給你。',
})

// 頁面只做接線：這一條路列的是現貨機器人。時區、連線燈與帳號由 console 版型統一接線。
</script>

<template>
  <StrategyBotListPage market-data-kind="kCandle" />
</template>
