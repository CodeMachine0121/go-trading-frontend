<script setup lang="ts">
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import BackendStatusIndicator from '~/components/molecules/BackendStatusIndicator.vue'
import SignedInUserBadge from '~/components/molecules/SignedInUserBadge.vue'
import TradingStrategyListPanel from '~/components/organisms/TradingStrategyListPanel.vue'

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
const { $tradingStrategyApplication } = useNuxtApp()

const { health, checking, errorMessage, checkBackendHealth } = useBackendHealth()
const { currentUser, signOut } = useUserSession()

// 現在這個寬度代表什麼。這一頁用到的是「拼得動一份新的嗎」。
const { layoutDensity } = useLayoutDensity()
</script>

<template>
  <ConsoleLayout
    title="交易策略"
    subtitle="把幾支策略腳本的訊號拼成兩個條件：什麼情況算買、什麼情況算賣。拼好的一份可以讓好幾台機器人一起用，改一次就是改全部。"
  >
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

    <TradingStrategyListPanel
      :layout-density="layoutDensity"
      :trading-strategy-application="$tradingStrategyApplication"
    />
  </ConsoleLayout>
</template>
