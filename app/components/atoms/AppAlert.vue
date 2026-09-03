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
  gap: spacing('sm');

  // 訊息可能長到換行，動作要留在第一行旁邊而不是掉到中間。
  align-items: flex-start;
  justify-content: space-between;
  border: 1px solid color('border');
  border-left-width: 2px;
  border-radius: radius('sm');
  background-color: color('surface');
  padding: spacing('xs') spacing('sm');
  font-size: font-size('xs');
  line-height: line-height('normal');

  &__message {
    margin: 0;
  }

  &__action {
    flex: none;
  }

  // 深色底上光靠一條左邊框太弱，整塊帶一層語氣的底色才看得出這是哪一類訊息
  &--info {
    border-color: color('info-soft');
    border-left-color: color('info');
    background-color: color('info-soft');
  }

  &--danger {
    border-color: color('danger-soft');
    border-left-color: color('danger');
    background-color: color('danger-soft');
    color: color('danger');
  }

  &--warning {
    border-color: color('warning-soft');
    border-left-color: color('warning');
    background-color: color('warning-soft');
    color: color('warning');
  }

  &--success {
    border-color: color('success-soft');
    border-left-color: color('success');
    background-color: color('success-soft');
    color: color('success');
  }
}
</style>
