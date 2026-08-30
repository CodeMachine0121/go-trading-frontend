<script setup lang="ts">
// 原子：狀態標籤。語氣由使用端決定，元件本身不認識任何領域概念。
type BadgeVariant = 'success' | 'danger' | 'neutral' | 'info' | 'warning'

const { variant = 'neutral' } = defineProps<{ variant?: BadgeVariant }>()
</script>

<template>
  <span
    class="app-badge"
    :class="`app-badge--${variant}`"
  >
    <slot />
  </span>
</template>

<style scoped lang="scss">
.app-badge {
  display: inline-block;
  border-radius: radius('pill');
  padding: spacing('2xs') spacing('xs');
  line-height: line-height('tight');
  font-weight: font-weight('medium');
  font-size: font-size('xs');
  white-space: nowrap;

  &--success {
    background-color: color('success');
    color: color('text-inverse');
  }

  &--danger {
    background-color: color('danger');
    color: color('text-inverse');
  }

  &--warning {
    background-color: color('warning');
    color: color('text-inverse');
  }

  &--info {
    background-color: color('info');
    color: color('text-inverse');
  }

  &--neutral {
    background-color: color('surface-muted');
    color: color('text-muted');
  }
}
</style>
