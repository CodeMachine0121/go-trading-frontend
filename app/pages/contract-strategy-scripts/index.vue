<script setup lang="ts">
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import TimeZoneField from '~/components/molecules/TimeZoneField.vue'
import BackendStatusIndicator from '~/components/molecules/BackendStatusIndicator.vue'
import IndicatorCalculationPanel from '~/components/organisms/IndicatorCalculationPanel.vue'
import SignedInUserBadge from '~/components/molecules/SignedInUserBadge.vue'

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
// 這一頁的身分是「合約行情」：同一塊工作區，寫、存、算的都是吃合約行情格的策略腳本。
const {
  $indicatorCalculationApplication,
  $strategyScriptApplication,
  $strategyScriptMarketplaceApplication,
  $tradingSymbolApplication,
  $backtestApplication,
} = useNuxtApp()

// 顯示時區是跨畫面共用的畫面狀態：頁面取用它，往下傳給要說時間的元件。
const { selectableTimeZones, selectedTimeZone, selectTimeZone } = useSelectedTimeZone()

// 後端還活著嗎也是跨畫面共用的：側欄那顆燈走到哪一頁都亮著，答案共用同一次檢查。
const { health, checking, errorMessage, checkBackendHealth } = useBackendHealth()

// 側欄底下那一行：現在是誰在用。它與那顆連線燈一樣是「這條線路的狀態」，
// 所以同樣由頁面填進樣板的插槽——樣板不綁任何資料。
const { currentUser, signOut } = useUserSession()
</script>

<template>
  <ConsoleLayout
    title="合約策略腳本"
    subtitle="寫一支吃永續合約行情的算式：每一格除了成交價，還帶著標記價格、資金費率與持倉統計。試跑、存起來；合約的回測還沒開放。算式一律送到後端沙箱執行。"
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

    <template #account>
      <SignedInUserBadge
        v-if="currentUser"
        :user="currentUser"
        @sign-out="signOut"
      />
    </template>

    <IndicatorCalculationPanel
      :indicator-calculation-application="$indicatorCalculationApplication"
      :strategy-script-application="$strategyScriptApplication"
      :strategy-script-marketplace-application="$strategyScriptMarketplaceApplication"
      :trading-symbol-application="$tradingSymbolApplication"
      :backtest-application="$backtestApplication"
      :time-zone="selectedTimeZone"
      market-data-kind="contractKCandle"
    />
  </ConsoleLayout>
</template>
