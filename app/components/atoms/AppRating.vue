<script setup lang="ts">
// 原子：一排點點選一個一到 max 的整數；再按一次目前選的那一點即清空（可不填時）。
const { max = 5, label, clearable = true, disabled = false } = defineProps<{
  max?: number
  /** 讀螢幕的人聽到的名字。 */
  label: string
  clearable?: boolean
  disabled?: boolean
}>()

const modelValue = defineModel<number | null>({ required: true })

const levels = computed(() => Array.from({ length: max }, (_, index) => index + 1))

function choose(level: number): void {
  if (disabled) {
    return
  }

  modelValue.value = clearable && modelValue.value === level ? null : level
}
</script>

<template>
  <div
    class="app-rating"
    role="radiogroup"
    :aria-label="label"
  >
    <button
      v-for="level in levels"
      :key="level"
      type="button"
      role="radio"
      class="app-rating__dot"
      :class="{ 'app-rating__dot--filled': modelValue !== null && level <= modelValue }"
      :aria-checked="modelValue === level"
      :aria-label="`${level} / ${max}`"
      :disabled="disabled"
      :data-testid="`app-rating-${level}`"
      @click="choose(level)"
    />
    <span
      class="app-rating__value"
      aria-hidden="true"
    >{{ modelValue === null ? '—' : `${modelValue} / ${max}` }}</span>
  </div>
</template>

<style scoped lang="scss">
.app-rating {
  display: inline-flex;
  gap: spacing('3xs');
  align-items: center;
  min-height: spacing('xl');

  &__dot {
    transition: background-color duration('fast') ease, border-color duration('fast') ease;
    cursor: pointer;
    border: 1px solid color('border-strong');
    border-radius: radius('pill');
    background-color: transparent;
    padding: 0;
    width: spacing('sm');
    height: spacing('sm');

    @include focus-ring;

    &:hover:not(:disabled) {
      border-color: color('primary');
    }

    &:disabled {
      cursor: default;
    }

    &--filled {
      border-color: color('primary');
      background-color: color('primary');
    }
  }

  &__value {
    margin-left: spacing('2xs');
    color: color('text-faint');
    font-size: font-size('2xs');

    @include numeric;
  }
}
</style>
