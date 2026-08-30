<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import type { BackendHealthDto } from '~/domain/models/dto/backend-health-dto'

// 分子：由原子（AppButton）與文字組成的一個完整功能區塊。
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
      <AppButton
        variant="secondary"
        size="small"
        :disabled="loading"
        @click="$emit('refresh')"
      >
        {{ loading ? '檢查中…' : '重新檢查' }}
      </AppButton>
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
      class="backend-health-card__idle"
      data-testid="idle"
    >
      尚未檢查
    </p>
  </section>
</template>

<style scoped lang="scss">
.backend-health-card {
  @include surface('md');

  &__header {
    display: flex;
    gap: spacing('md');
    align-items: center;
    justify-content: space-between;
  }

  &__error {
    color: color('danger');
  }

  &__idle {
    color: color('text-muted');
  }
}
</style>
