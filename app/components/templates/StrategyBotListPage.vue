<script setup lang="ts">
import StrategyBotListPanel from '~/components/organisms/StrategyBotListPanel.vue'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'

// 模板：機器人清單那一頁的內容。
//
// 現貨策略機器人與合約策略機器人共用它，因為兩頁要做的一模一樣——
// 差別只有「列哪一種」，而那是一個參數，不是兩份頁面。
// 標題、時區、連線燈與帳號由 console 版型統一接線，這裡只接清單本身。
const { marketDataKind } = defineProps<{
  marketDataKind: MarketDataKind
}>()

const { $strategyBotApplication } = useNuxtApp()
const page = $strategyBotApplication.pageFor(marketDataKind)

// 執行紀錄用哪一個時區說：整個操作台只有一個，由頂列那一格決定。
const { selectedTimeZone } = useSelectedTimeZone()

// 寬螢幕上選中的那一台在清單旁邊展開；手機上沒有旁邊，就展開在那一台底下。
const { layoutDensity } = useLayoutDensity()
</script>

<template>
  <StrategyBotListPanel
    :strategy-bot-application="$strategyBotApplication"
    :page="page"
    :time-zone-identifier="selectedTimeZone.identifier"
    :shows-detail-inline="layoutDensity.usesBottomNavigation"
  />
</template>
