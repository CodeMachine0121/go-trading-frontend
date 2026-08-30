<script setup lang="ts">
import type { BackendHealthDto } from '~/domain/models/dto/backend-health-dto'

// 元件（Controller）只認識 DTO 與 Application，不認識 entity / domain model / proxy。
defineProps<{
  health: BackendHealthDto | null
  loading: boolean
  errorMessage: string | null
}>()

defineEmits<{
  refresh: []
}>()
</script>

<template>
  <section class="backend-health-card">
    <header class="backend-health-card__header">
      <h2>後端連線狀態</h2>
      <button
        type="button"
        :disabled="loading"
        @click="$emit('refresh')"
      >
        {{ loading ? '檢查中…' : '重新檢查' }}
      </button>
    </header>

    <p
      v-if="errorMessage"
      class="backend-health-card__error"
      data-testid="error"
    >
      {{ errorMessage }}
    </p>

    <p
      v-else-if="health"
      class="backend-health-card__status"
      data-testid="status"
    >
      {{ health.healthy ? '正常' : '異常' }}（{{ health.status }}）
    </p>

    <p
      v-else
      data-testid="idle"
    >
      尚未檢查
    </p>
  </section>
</template>

<style scoped>
.backend-health-card {
  border: 1px solid #d4d4d8;
  border-radius: 8px;
  padding: 1rem 1.25rem;
}

.backend-health-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.backend-health-card__error {
  color: #b91c1c;
}
</style>
