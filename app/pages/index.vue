<script setup lang="ts">
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
      ? '連不上後端 go-stock API，請確認它已啟動。'
      : '檢查後端狀態時發生未預期的錯誤。'
    health.value = null
  }
  finally {
    loading.value = false
  }
}

onMounted(checkBackendHealth)
</script>

<template>
  <main class="home">
    <h1>go-trading-frontend</h1>
    <BackendHealthCard
      :health="health"
      :loading="loading"
      :error-message="errorMessage"
      @refresh="checkBackendHealth"
    />
  </main>
</template>

<style scoped lang="scss">
.home {
  display: flex;
  flex-direction: column;
  gap: spacing('lg');
  margin: 0 auto;
  max-width: 640px;
  padding: spacing('xl') spacing('md');

  @include respond-to('md') {
    padding: spacing('2xl') spacing('lg');
  }
}
</style>
