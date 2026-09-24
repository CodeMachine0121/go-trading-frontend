<script setup lang="ts">
/**
 * 原子：一個開關。
 *
 * 兩邊的字由使用端用 slot 說（`off` 在左、`on` 在右），所以它不認識任何領域概念——
 * 現貨／合約只是其中一種用法。按不動時照樣看得到，而且說得出為什麼（`title`）。
 */
const { disabled = false, label } = defineProps<{
  disabled?: boolean
  /** 讀螢幕的人聽到的名字，也是滑鼠停留時的提示。 */
  label: string
}>()

const modelValue = defineModel<boolean>({ required: true })

function toggle(): void {
  if (!disabled) {
    modelValue.value = !modelValue.value
  }
}
</script>

<template>
  <button
    type="button"
    role="switch"
    class="app-switch"
    :class="{ 'app-switch--on': modelValue }"
    :aria-checked="modelValue"
    :aria-disabled="disabled"
    :aria-label="label"
    :title="label"
    data-testid="app-switch"
    @click="toggle"
  >
    <span class="app-switch__label app-switch__label--off"><slot name="off" /></span>
    <span class="app-switch__track"><span class="app-switch__thumb" /></span>
    <span class="app-switch__label app-switch__label--on"><slot name="on" /></span>
  </button>
</template>

<style scoped lang="scss">
.app-switch {
  display: inline-flex;
  gap: spacing('xs');
  align-items: center;
  border: 1px solid color('border');
  border-radius: radius('pill');
  background-color: color('surface');
  cursor: pointer;
  padding: spacing('3xs') spacing('sm');
  color: color('text-faint');
  font-weight: font-weight('medium');
  font-size: font-size('sm');

  @include focus-ring;
  @include tap-target;

  &[aria-disabled='true'] {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &__label {
    transition: color duration('fast') ease;
  }

  &:not(&--on) &__label--off,
  &--on &__label--on {
    color: color('text-strong');
  }

  &__track {
    position: relative;
    flex: none;
    transition: background-color duration('fast') ease, border-color duration('fast') ease;
    border: 1px solid color('border-strong');
    border-radius: radius('pill');
    background-color: color('surface-muted');
    width: 2.25rem;
    height: 1.25rem;
  }

  &__thumb {
    position: absolute;
    top: 1px;
    left: 1px;
    transition: transform duration('fast') ease;
    border-radius: radius('pill');
    background-color: color('text-strong');
    width: 1rem;
    height: 1rem;
  }

  &--on &__track {
    border-color: color('primary');
    background-color: color('primary');
  }

  &--on &__thumb {
    transform: translateX(1rem);
    background-color: color('text-inverse');
  }
}
</style>
