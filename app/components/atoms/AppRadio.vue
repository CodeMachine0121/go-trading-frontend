<script setup lang="ts">
// 原子：全站唯一的單選鈕。一顆按鈕、它的名字，以及可選的一行說明。
//
// 它不認識任何領域資料——與 AppSelect 一樣，選什麼由使用端決定。
// 說明那一行是這個原子存在的理由之一：並排的選項通常是因為**選項本身需要解釋**
// 才不做成下拉選單，而解釋若寫在原子外面，就會離它要解釋的那顆按鈕愈來愈遠。
const { value, label, name, description = '', disabled = false } = defineProps<{
  /** 挑中這一顆時 v-model 會變成的值。 */
  value: string
  label: string
  /** 同一組的每一顆共用一個 name，瀏覽器才知道它們互斥。 */
  name: string
  description?: string
  disabled?: boolean
}>()

const modelValue = defineModel<string>({ required: true })
</script>

<template>
  <label
    class="app-radio"
    :class="{ 'app-radio--disabled': disabled }"
  >
    <input
      v-model="modelValue"
      class="app-radio__input"
      type="radio"
      :name="name"
      :value="value"
      :disabled="disabled"
    >
    <span class="app-radio__body">
      <span class="app-radio__label">{{ label }}</span>
      <span
        v-if="description"
        class="app-radio__description"
      >{{ description }}</span>
    </span>
  </label>
</template>

<style scoped lang="scss">
.app-radio {
  display: flex;
  align-items: start;
  transition: border-color duration('fast') ease, background-color duration('fast') ease;
  cursor: pointer;
  border: 1px solid color('border-strong');
  border-radius: radius('sm');

  // 與輸入框同一個暗度：它們都是「可以動的東西」。
  background-color: color('background');
  padding: spacing('xs');
  gap: spacing('2xs');

  @include tap-target;

  &:hover:not(&--disabled) {
    border-color: color('text-faint');
  }

  // 整顆被挑中時整塊都要看得出來，而不是只有那個小圓點——
  // 並排的選項是拿來一眼掃過的，小圓點在掃視時看不見。
  &:has(.app-radio__input:checked) {
    border-color: color('primary');
    background-color: color('primary-soft');
  }

  &__input {
    flex-shrink: 0;
    accent-color: color('primary');

    // 與第一行文字對齊，而不是與整塊的頂端對齊。
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

  // 解釋比名字淡一階：它是讀完名字之後才會去看的東西。
  &__description {
    color: color('text-faint');
    font-size: font-size('2xs');
    line-height: line-height('normal');
  }

  &--disabled {
    cursor: not-allowed;
    border-color: color('border');
    background-color: color('surface-muted');

    .app-radio__label {
      color: color('text-faint');
    }
  }
}
</style>
