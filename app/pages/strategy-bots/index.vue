<script setup lang="ts">
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import TimeZoneField from '~/components/molecules/TimeZoneField.vue'
import BackendStatusIndicator from '~/components/molecules/BackendStatusIndicator.vue'
import SignedInUserBadge from '~/components/molecules/SignedInUserBadge.vue'
import StrategyBotListPanel from '~/components/organisms/StrategyBotListPanel.vue'

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
const { $strategyBotApplication } = useNuxtApp()

const { selectableTimeZones, selectedTimeZone, selectTimeZone } = useSelectedTimeZone()
const { health, checking, errorMessage, checkBackendHealth } = useBackendHealth()
const { currentUser, signOut } = useUserSession()
</script>

<template>
  <ConsoleLayout
    title="策略機器人"
    subtitle="把幾支策略腳本的訊號拼成兩個條件：什麼情況算買、什麼情況算賣。按下播放之後你就可以離開——它每隔幾分鐘自己看一次，訊號變了才傳訊息給你。"
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
      :time-zone-identifier="selectedTimeZone.identifier"
    />
  </ConsoleLayout>
</template>
