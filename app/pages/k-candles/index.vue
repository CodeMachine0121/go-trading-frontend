<script setup lang="ts">
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import TimeZoneField from '~/components/molecules/TimeZoneField.vue'
import BackendStatusIndicator from '~/components/molecules/BackendStatusIndicator.vue'
import KCandleSearchPanel from '~/components/organisms/KCandleSearchPanel.vue'
import SignedInUserBadge from '~/components/molecules/SignedInUserBadge.vue'

// 頁面只做接線：從組裝根取得 Application 往下傳，互動邏輯住在 organism。
const { $kCandleApplication, $tradingSymbolApplication } = useNuxtApp()

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
    title="K 線瀏覽"
    subtitle="指定交易標的與開始時間查詢，查到送出當下為止，結果由新到舊列出；時間一律照頂欄選定的時區呈現。"
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

    <KCandleSearchPanel
      :k-candle-application="$kCandleApplication"
      :trading-symbol-application="$tradingSymbolApplication"
      :time-zone="selectedTimeZone"
    />
  </ConsoleLayout>
</template>
