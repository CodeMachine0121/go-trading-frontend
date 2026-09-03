<script setup lang="ts">
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import TimeZoneField from '~/components/molecules/TimeZoneField.vue'
import BackendHealthCard from '~/components/molecules/BackendHealthCard.vue'
import type { BackendHealthDto } from '~/domain/models/dto/backend-health-dto'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

const { $backendHealthApplication } = useNuxtApp()

const health = ref<BackendHealthDto | null>(null)
const loading = ref(false)
const errorMessage = ref<string | null>(null)

async function checkBackendHealth() {
  loading.value = true
  errorMessage.value = null
  try {
    health.value = await $backendHealthApplication.checkBackendHealth()
  }
  catch (error: unknown) {
    // 哨兵錯誤分流：等同後端 controller 把領域錯誤對映成狀態碼
    errorMessage.value = error instanceof BackendUnreachableError
      ? '連不上後端 go-trading API，請確認它已啟動，且本站來源在它的 CORS_ALLOWED_ORIGINS 名單內。'
      : '檢查後端狀態時發生未預期的錯誤。'
    health.value = null
  }
  finally {
    loading.value = false
  }
}

onMounted(checkBackendHealth)

// 顯示時區是跨畫面共用的畫面狀態：頁面取用它，往下傳給要說時間的元件。
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

    <BackendHealthCard
      :health="health"
      :loading="loading"
      :error-message="errorMessage"
      @refresh="checkBackendHealth"
    />
  </ConsoleLayout>
</template>
