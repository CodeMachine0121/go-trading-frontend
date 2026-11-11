<script setup lang="ts">
// 原子：全站唯一的勾選框。一個框、它的名字，以及可選的一行說明。
//
// 它不認識任何領域資料——勾的是什麼由使用端決定。長相與 AppRadio 同一套：
// 並排的開關是拿來一眼掃過的，所以勾著的那一塊整塊都看得出來，而不是只有那個小框。
const { label, description = '', disabled = false } = defineProps<{
  label: string
  description?: string
  disabled?: boolean
}>()

const modelValue = defineModel<boolean>({ required: true })
</script>

<template>
  <label
    class="app-checkbox"
    :class="{ 'app-checkbox--disabled': disabled }"
  >
    <input
      v-model="modelValue"
      class="app-checkbox__input"
      type="checkbox"
      :disabled="disabled"
    >
    <span class="app-checkbox__body">
      <span class="app-checkbox__label">{{ label }}</span>
      <span
        v-if="description"
        class="app-checkbox__description"
      >{{ description }}</span>
    </span>
  </label>
</template>

<style scoped lang="scss">
.app-checkbox {
  display: flex;
  align-items: start;
  transition: border-color duration('fast') ease, background-color duration('fast') ease;
  cursor: pointer;
  border: 1px solid color('border-strong');
  border-radius: radius('sm');
  background-color: color('background');
  padding: spacing('xs');
  gap: spacing('2xs');

  @include tap-target;

  &:hover:not(&--disabled) {
    border-color: color('text-faint');
  }

  &:has(.app-checkbox__input:checked) {
    border-color: color('primary');
    background-color: color('primary-soft');
  }

  &__input {
    flex-shrink: 0;
    accent-color: color('primary');
    margin-top: 0.15em;
    cursor: inherit;

    @include focus-ring;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    min-width: 0;
  }

  &__label {
    color: color('text-strong');
    font-size: font-size('sm');
  }

  &__description {
    color: color('text-faint');
    font-size: font-size('2xs');
    line-height: line-height('normal');
  }

  &--disabled {
    cursor: not-allowed;
    border-color: color('border');
    background-color: color('surface-muted');

    .app-checkbox__label {
      color: color('text-faint');
    }
  }
}
</style>
