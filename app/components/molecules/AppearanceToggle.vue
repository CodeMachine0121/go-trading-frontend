<script setup lang="ts">
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppTabs from '~/components/atoms/AppTabs.vue'
import type { AppearanceDto } from '~/domain/models/dto/appearance-dto'
import type { AppearanceChoiceVo } from '~/domain/models/vo/appearance-choice-vo'

/**
 * 分子：外觀三選一。
 *
 * 兩種長相、同一個元件：頂列上是三顆圖示（`compact`），設定頁上是三個字（`labelled`）。
 * 兩處吃的是同一份 DTO，所以永遠一致。
 */
const { appearance, variant = 'compact' } = defineProps<{
  appearance: AppearanceDto
  variant?: 'compact' | 'labelled'
}>()

const emit = defineEmits<{ select: [choice: AppearanceChoiceVo] }>()

const ICONS = { light: 'sun', system: 'monitor', dark: 'moon' } as const

const selected = computed({
  get: () => appearance.choice,
  set: (choice: string) => {
    const option = appearance.options.find(candidate => candidate.value === choice)
    if (option !== undefined) {
      emit('select', option.value)
    }
  },
})
</script>

<template>
  <div
    v-if="variant === 'compact'"
    class="appearance-toggle"
    role="radiogroup"
    aria-label="外觀"
    data-testid="appearance-toggle"
  >
    <button
      v-for="option in appearance.options"
      :key="option.value"
      type="button"
      role="radio"
      class="appearance-toggle__option"
      :class="{ 'appearance-toggle__option--selected': option.value === appearance.choice }"
      :aria-checked="option.value === appearance.choice"
      :aria-label="option.label"
      :title="option.label"
      :data-testid="`appearance-${option.value}`"
      @click="selected = option.value"
    >
      <AppIcon
        :name="ICONS[option.value]"
        size="small"
      />
    </button>
  </div>

  <AppTabs
    v-else
    v-model="selected"
    variant="segmented"
    :options="appearance.options"
    data-testid="appearance-toggle"
  />
</template>

<style scoped lang="scss">
.appearance-toggle {
  display: inline-flex;
  border: 1px solid color('border');
  border-radius: radius('sm');
  background-color: color('surface');
  padding: spacing('3xs');

  &__option {
    display: grid;
    place-items: center;
    border: none;
    border-radius: radius('xs');
    background: none;
    cursor: pointer;
    padding: spacing('2xs') spacing('xs');
    color: color('text-faint');

    @include focus-ring;

    &:hover {
      color: color('text-strong');
    }

    &--selected {
      box-shadow: inset 0 0 0 1px color('border-strong');
      background-color: color('surface-muted');
      color: color('text-strong');
    }
  }
}
</style>
