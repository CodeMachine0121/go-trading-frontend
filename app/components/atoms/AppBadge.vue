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

  // 深色底上一整塊實心色太搶戲，尤其表格裡每一列都有一個；
  // 改成同色系的軟底加上原色的字，語氣還在，但不會蓋過數字本身。
  &--success {
    background-color: color('success-soft');
    color: color('success');
  }

  &--danger {
    background-color: color('danger-soft');
    color: color('danger');
  }

  &--warning {
    background-color: color('warning-soft');
    color: color('warning');
  }

  &--info {
    background-color: color('info-soft');
    color: color('info');
  }

  &--neutral {
    background-color: color('surface-muted');
    color: color('text-muted');
  }
}
</style>
