<script setup lang="ts">
import AppBadge from '~/components/atoms/AppBadge.vue'
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
      <AppBadge :variant="health.tone">
        {{ health.label }}
      </AppBadge>
      <span class="backend-health-card__status-value">{{ health.status }}</span>
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
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  @include surface('lg');

  &__header {
    display: flex;
    gap: spacing('md');
    align-items: center;
    justify-content: space-between;
  }

  &__error {
    margin: 0;
    color: color('danger');
  }

  &__idle {
    margin: 0;
    color: color('text-muted');
  }

  // 這一頁只回答一個問題：後端活著嗎。答案就該是整頁最大的那一行。
  &__status {
    display: flex;
    gap: spacing('sm');
    align-items: center;
    margin: 0;
  }

  &__status-value {
    color: color('text-strong');
    font-size: font-size('lg');
    font-family: font-family('mono');
  }
}
</style>
