<script setup lang="ts">
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import TimeZoneField from '~/components/molecules/TimeZoneField.vue'
import BackendStatusIndicator from '~/components/molecules/BackendStatusIndicator.vue'
import BackendHealthCard from '~/components/molecules/BackendHealthCard.vue'

// 頁面只做接線：取用跨畫面共用的畫面狀態，往下傳給要說它的元件。
//
// 後端狀態與側欄那顆燈共用同一次檢查（見 useBackendHealth）——
// 這一頁只是把同一個答案講得大聲一點，不會自己再問一次。
const { health, checking, errorMessage, checkBackendHealth } = useBackendHealth()

const { selectableTimeZones, selectedTimeZone, selectTimeZone } = useSelectedTimeZone()
</script>

<template>
  <ConsoleLayout
    title="連線狀態"
    subtitle="這個操作台的每一個功能都以後端 go-trading 可用為前提。"
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

    <BackendHealthCard
      :health="health"
      :loading="checking"
      :error-message="errorMessage"
      @refresh="checkBackendHealth"
    />
  </ConsoleLayout>
</template>
