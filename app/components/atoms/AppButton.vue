<script setup lang="ts">
// 全站唯一的按鈕元件（原子）。
// 畫面上按鈕有幾十種長相，但「按鈕」這個概念只有這一個元件——
// 外觀由使用端透過 variant / size / block 決定，不另外長出 PrimaryButton、DangerButton。
// 需要新的長相時，是在這裡新增一個 variant（並在 token 內補色），不是新增一個元件。
// 詳見 .claude/rules/component-design.md。

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'small' | 'medium' | 'large'

const { variant = 'primary', size = 'medium', block = false, label } = defineProps<{
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  /**
   * 只放圖示、沒有文字時，這顆按鈕叫什麼。
   *
   * **它是必要的，不是裝飾**：一顆只有圖示的按鈕，對讀螢幕的人來說什麼都沒說，
   * 對看得到但不確定那個圖示是什麼意思的人也一樣。給了它，兩種人都問得出答案——
   * 一個從無障礙名稱、一個從滑鼠停留的提示。
   */
  label?: string
}>()

// disabled / type / @click 等原生行為一律走 attribute fallthrough，不重新包一層 props。
</script>

<template>
  <button
    class="app-button"
    :class="[
      `app-button--${variant}`,
      `app-button--${size}`,
      { 'app-button--block': block, 'app-button--labelled': label !== undefined },
    ]"
    type="button"
    :aria-label="label"
    :title="label"
  >
    <slot />
  </button>
</template>

<style scoped lang="scss">
.app-button {
  display: inline-flex;
  gap: spacing('2xs');
  align-items: center;
  justify-content: center;
  transition: background-color duration('fast') ease, border-color duration('fast') ease;
  border: 1px solid transparent;
  border-radius: radius('md');
  cursor: pointer;
  line-height: line-height('tight');
  font-weight: font-weight('medium');

  @include focus-ring;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &--small {
    padding: spacing('2xs') spacing('xs');
    font-size: font-size('xs');
  }

  &--medium {
    padding: spacing('xs') spacing('md');
    font-size: font-size('sm');
  }

  &--large {
    padding: spacing('sm') spacing('lg');
    font-size: font-size('md');
  }

  &--block {
    display: flex;
    width: 100%;
  }

  // 只放圖示時左右不需要留給文字的空間，收成正方形才不會看起來歪歪的。
  // 它與 size 相乘，所以大小仍然由使用端決定。
  &--labelled {
    aspect-ratio: 1;
    padding: spacing('xs');
  }

  &--primary {
    background-color: color('primary');
    color: color('text-inverse');

    &:hover:not(:disabled) {
      background-color: color('primary-strong');
    }
  }

  &--secondary {
    border-color: color('border');
    background-color: color('surface');
    color: color('text');

    &:hover:not(:disabled) {
      background-color: color('surface-muted');
    }
  }

  &--ghost {
    background-color: transparent;
    color: color('primary');

    &:hover:not(:disabled) {
      background-color: color('primary-soft');
    }
  }

  &--danger {
    background-color: color('danger');
    color: color('text-inverse');
  }
}
</style>
