<script setup lang="ts">
// 原子：全站唯一的分頁切換。它不認識任何領域概念——選項是一組「值＋標籤」，
// 選了哪一個由使用端持有。
//
// 它是**切換**而不是導覽：兩邊都還在，只是其中一邊此刻看得見。
// 所以它 emit 的是「現在選了哪一個」，不是「去某個地方」。
type TabOption = {
  value: string
  label: string
}

const { options } = defineProps<{ options: readonly TabOption[] }>()

const modelValue = defineModel<string>({ required: true })
</script>

<template>
  <div
    class="app-tabs"
    role="tablist"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="tab"
      class="app-tabs__tab"
      :class="{ 'app-tabs__tab--selected': option.value === modelValue }"
      :aria-selected="option.value === modelValue"
      :data-testid="`tab-${option.value}`"
      @click="modelValue = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.app-tabs {
  display: flex;
  gap: spacing('2xs');

  // 一條底線把分頁與底下那一片綁成同一個東西：選中的那一顆坐在線上，
  // 沒選的縮在線後面。少了這條線，兩顆按鈕看起來只是兩顆按鈕。
  border-bottom: 1px solid color('border');

  &__tab {
    transition: color duration('fast') ease, border-color duration('fast') ease;
    margin-bottom: -1px;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    cursor: pointer;
    padding: spacing('2xs') spacing('sm');
    color: color('text-muted');
    font-weight: font-weight('medium');
    font-size: font-size('sm');

    @include focus-ring;

    &:hover:not(&--selected) {
      color: color('text-strong');
    }

    &--selected {
      border-bottom-color: color('primary');
      color: color('text-strong');
    }
  }
}
</style>
