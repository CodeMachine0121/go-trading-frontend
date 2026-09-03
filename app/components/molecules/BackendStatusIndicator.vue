<script setup lang="ts">
import AppIcon from '~/components/atoms/AppIcon.vue'
import type { BackendHealthDto } from '~/domain/models/dto/backend-health-dto'

// 分子：側欄底下那顆燈。
//
// 交易終端機把「線路還通嗎」擺在側欄最下面一直亮著，因為它是其他每一件事的前提——
// 要去查才知道的話，使用者會先怪自己的查詢條件，才想到後端根本沒開。
//
// 它只說結果，不判斷結果：亮什麼顏色由 DTO 的 tone 決定，這裡不寫
// `healthy ? '綠' : '紅'`。
const { health, checking, errorMessage = null } = defineProps<{
  health: BackendHealthDto | null
  checking: boolean
  errorMessage?: string | null
}>()

const emit = defineEmits<{ recheck: [] }>()

/**
 * 燈有四種說法，而且順序有講究：正在查的時候不要先報上一次的結果，
 * 連不上的時候不要說成「不健康」——那是兩件不同的事，下一步也不一樣。
 */
const state = computed(() => {
  if (checking) {
    return { tone: 'checking', label: '檢查中' }
  }
  if (errorMessage !== null) {
    return { tone: 'unreachable', label: '連不上' }
  }
  if (health !== null) {
    return { tone: health.tone, label: health.label }
  }

  return { tone: 'idle', label: '尚未檢查' }
})
</script>

<template>
  <div class="backend-status-indicator">
    <span class="backend-status-indicator__label">後端</span>

    <span
      class="backend-status-indicator__state"
      :class="`backend-status-indicator__state--${state.tone}`"
      data-testid="backend-status"
    >
      <span class="backend-status-indicator__dot" />
      {{ state.label }}
    </span>

    <button
      class="backend-status-indicator__recheck"
      type="button"
      aria-label="重新檢查後端狀態"
      title="重新檢查後端狀態"
      :disabled="checking"
      data-testid="backend-status-recheck"
      @click="emit('recheck')"
    >
      <AppIcon
        name="refresh"
        size="small"
      />
    </button>
  </div>
</template>

<style scoped lang="scss">
.backend-status-indicator {
  display: flex;
  gap: spacing('xs');
  align-items: center;

  &__label {
    @include dense-label;
  }

  &__state {
    display: flex;
    gap: spacing('2xs');
    align-items: center;
    margin-right: auto;
    font-size: font-size('2xs');
  }

  &__dot {
    flex: none;
    border-radius: radius('pill');

    // 一顆燈只要夠亮就看得到，不必大。
    width: 0.4375rem;
    height: 0.4375rem;
    background-color: currentcolor;
  }

  &__state--success {
    color: color('success');
  }

  &__state--danger,
  &__state--unreachable {
    color: color('danger');
  }

  &__state--checking {
    color: color('info');
  }

  &__state--idle {
    color: color('text-faint');
  }

  &__recheck {
    display: inline-flex;
    flex: none;
    border: none;
    border-radius: radius('sm');
    background: none;
    cursor: pointer;
    padding: spacing('3xs');
    color: color('text-faint');

    @include focus-ring;

    &:hover:not(:disabled) {
      background-color: color('surface-muted');
      color: color('text-strong');
    }

    &:disabled {
      cursor: not-allowed;
    }
  }
}
</style>
