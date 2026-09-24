<script setup lang="ts">
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import TimeZoneField from '~/components/molecules/TimeZoneField.vue'
import BackendStatusIndicator from '~/components/molecules/BackendStatusIndicator.vue'
import SignedInUserBadge from '~/components/molecules/SignedInUserBadge.vue'
import StrategyBotListPanel from '~/components/organisms/StrategyBotListPanel.vue'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'

// 模板：機器人清單那一頁的整個殼。
//
// 現貨策略機器人與合約策略機器人共用它，因為兩頁要做的一模一樣——
// 差別只有「列哪一種」，而那是一個參數，不是兩份頁面。標題與說明由那一種自己說。
const { marketDataKind } = defineProps<{
  marketDataKind: MarketDataKind
}>()

const { $strategyBotApplication } = useNuxtApp()
const page = $strategyBotApplication.pageFor(marketDataKind)

const { selectableTimeZones, selectedTimeZone, selectTimeZone } = useSelectedTimeZone()
const { health, checking, errorMessage, checkBackendHealth } = useBackendHealth()
const { currentUser, signOut } = useUserSession()
</script>

<template>
  <ConsoleLayout
    :title="page.listTitle"
    :subtitle="page.listSubtitle"
  >
    <template #timezone>
      <TimeZoneField
        :model-value="selectedTimeZone.identifier"
        :selectable-time-zones="selectableTimeZones"
        @update:model-value="selectTimeZone"
      />
    </template>

    <template #status>
      <BackendStatusIndicator
        :health="health"
        :checking="checking"
        :error-message="errorMessage"
        @recheck="checkBackendHealth"
      />
    </template>

    <template #identity>
      <SignedInUserBadge
        v-if="currentUser"
        :user="currentUser"
        @sign-out="signOut"
      />
    </template>

    <StrategyBotListPanel
      :strategy-bot-application="$strategyBotApplication"
      :page="page"
      :time-zone-identifier="selectedTimeZone.identifier"
    />
  </ConsoleLayout>
</template>
