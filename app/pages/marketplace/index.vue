<script setup lang="ts">
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import TimeZoneField from '~/components/molecules/TimeZoneField.vue'
import BackendStatusIndicator from '~/components/molecules/BackendStatusIndicator.vue'
import SignedInUserBadge from '~/components/molecules/SignedInUserBadge.vue'
import StrategyMarketplacePanel from '~/components/organisms/StrategyMarketplacePanel.vue'

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
const { $strategyMarketplaceApplication } = useNuxtApp()

const { selectableTimeZones, selectedTimeZone, selectTimeZone } = useSelectedTimeZone()
const { health, checking, errorMessage, checkBackendHealth } = useBackendHealth()
const { currentUser, signOut } = useUserSession()
</script>

<template>
  <ConsoleLayout
    title="策略市集"
    subtitle="大家分享出來的策略。看得到它算什麼、有哪些旋鈕，看不到它怎麼算；加入之後就出現在你挑策略的地方。"
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

    <StrategyMarketplacePanel
      :strategy-marketplace-application="$strategyMarketplaceApplication"
    />
  </ConsoleLayout>
</template>
