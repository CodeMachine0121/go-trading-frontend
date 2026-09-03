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
  transition: background-color duration('fast') ease, border-color duration('fast') ease,
    color duration('fast') ease;
  border: 1px solid transparent;
  border-radius: radius('sm');
  cursor: pointer;
  line-height: line-height('tight');
  font-weight: font-weight('medium');
  white-space: nowrap;

  @include focus-ring;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &--small {
    padding: spacing('3xs') spacing('xs');
    font-size: font-size('2xs');
  }

  &--medium {
    padding: spacing('xs') spacing('sm');
    font-size: font-size('sm');
  }

  &--large {
    padding: spacing('sm') spacing('md');
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

  // 實心的強調色只留給「這個畫面上要按的那一顆」。
  // 一個版面上有兩顆亮藍色按鈕，等於沒有主要動作。
  &--primary {
    background-color: color('primary');
    color: color('text-inverse');

    &:hover:not(:disabled) {
      background-color: color('primary-strong');
    }
  }

  // 儀器上的按鍵：一圈髮絲線加一塊比面板略暗的鍵面，按下去才亮起來。
  &--secondary {
    border-color: color('border-strong');
    background-color: color('surface-muted');
    color: color('text');

    &:hover:not(:disabled) {
      border-color: color('text-faint');
      color: color('text-strong');
    }
  }

  // 幽靈按鈕在這裡是中性的，不是強調色的淡版——
  // 它們成排出現（區間、畫法、清單），一整排藍字會把版面吵翻。
  &--ghost {
    background-color: transparent;
    color: color('text-muted');

    &:hover:not(:disabled) {
      background-color: color('surface-muted');
      color: color('text-strong');
    }
  }

  &--danger {
    background-color: color('danger');
    color: color('text-inverse');

    &:hover:not(:disabled) {
      background-color: color('danger-soft');
      color: color('danger');
    }
  }
}
</style>
