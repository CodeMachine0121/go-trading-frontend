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

  // 它比一顆按鈕小得多，所以用比按鈕小一級的角——同一個半徑放在一個 20px 高的
  // 東西上會變成藥丸，而藥丸看起來像可以按。光學上等圓，數值上就不能相等。
  border-radius: radius('xs');
  padding: 0 spacing('2xs');
  line-height: 1.6;
  font-weight: font-weight('medium');
  font-size: font-size('2xs');
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
