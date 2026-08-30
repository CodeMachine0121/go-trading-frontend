<script setup lang="ts">
// 原子：整塊的提示訊息。語氣由使用端決定，內容與附加動作走 slot。
type AlertTone = 'info' | 'danger' | 'warning' | 'success'

const { tone = 'info' } = defineProps<{ tone?: AlertTone }>()
</script>

<template>
  <div
    class="app-alert"
    :class="`app-alert--${tone}`"
    role="status"
  >
    <p class="app-alert__message">
      <slot />
    </p>
    <div
      v-if="$slots.action"
      class="app-alert__action"
    >
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-alert {
  display: flex;
  gap: spacing('md');
  align-items: center;
  justify-content: space-between;
  border: 1px solid color('border');
  border-left-width: 4px;
  border-radius: radius('sm');
  background-color: color('surface');
  padding: spacing('sm') spacing('md');
  font-size: font-size('sm');

  &__message {
    margin: 0;
  }

  &--info {
    border-left-color: color('info');
  }

  &--danger {
    border-left-color: color('danger');
    color: color('danger');
  }

  &--warning {
    border-left-color: color('warning');
  }

  &--success {
    border-left-color: color('success');
  }
}
</style>
