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

/**
 * 兩種長相：`underline` 是一整排分頁（換到另一塊內容），
 * `segmented` 是一枚分段選擇（同一塊內容換一種看法，或兩三個互斥的選項）。
 */
type TabsVariant = 'underline' | 'segmented'

const { options, variant = 'underline', block = false } = defineProps<{
  options: readonly TabOption[]
  variant?: TabsVariant
  /** 分段選擇撐滿整寬、每一段等寬。 */
  block?: boolean
}>()

const modelValue = defineModel<string>({ required: true })
</script>

<template>
  <div
    class="app-tabs"
    :class="[`app-tabs--${variant}`, { 'app-tabs--block': block }]"
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

  // 窄螢幕上分頁多到擺不下時橫著捲，而不是折行——折了行的分頁，
  // 那條底線會斷成兩截，於是它不再把分頁與內容綁在一起。
  overflow-x: auto;

  > * {
    flex: none;
  }

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
    white-space: nowrap;

    @include focus-ring;
    @include tap-target;

    &:hover:not(&--selected) {
      color: color('text-strong');
    }

    &--selected {
      border-bottom-color: color('primary');
      color: color('text-strong');
    }
  }

  &--underline {
    border-bottom: 1px solid color('border');
  }

  &--segmented {
    display: inline-flex;
    gap: 0;
    border: 1px solid color('border');
    border-radius: radius('sm');
    background-color: color('surface');
    padding: spacing('3xs');
  }

  &--segmented &__tab {
    margin-bottom: 0;
    border-bottom: none;
    border-radius: radius('xs');
    padding: spacing('3xs') spacing('sm');

    &--selected {
      box-shadow: inset 0 0 0 1px color('border-strong');
      background-color: color('surface-muted');
    }
  }

  &--block {
    display: flex;
    width: 100%;
  }

  &--block &__tab {
    flex: 1;
  }
}
</style>
