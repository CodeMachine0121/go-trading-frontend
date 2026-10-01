<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import type { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'

const { tags, creatable = true, disabled = false } = defineProps<{
  tags: readonly TradeTagDto[]
  creatable?: boolean
  disabled?: boolean
}>()

const selectedIds = defineModel<number[]>('selectedIds', { required: true })

const emit = defineEmits<{ create: [name: string] }>()

const { t } = useI18n()

const newTagName = ref('')

function toggle(id: number): void {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter(selectedId => selectedId !== id)
    : [...selectedIds.value, id]
}

function create(): void {
  if (newTagName.value.trim() === '') {
    return
  }

  emit('create', newTagName.value.trim())
  newTagName.value = ''
}
</script>

<template>
  <div class="trade-tag-picker">
    <div class="trade-tag-picker__tags">
      <button
        v-for="tag in tags"
        :key="tag.id"
        type="button"
        class="trade-tag-picker__tag"
        :class="{ 'trade-tag-picker__tag--selected': selectedIds.includes(tag.id) }"
        :aria-pressed="selectedIds.includes(tag.id)"
        :disabled="disabled"
        :data-testid="`tag-option-${tag.id}`"
        @click="toggle(tag.id)"
      >
        {{ tag.name }}
      </button>
    </div>
    <div
      v-if="creatable"
      class="trade-tag-picker__create"
    >
      <AppInput
        v-model="newTagName"
        :placeholder="t('tradeJournal.tagPicker.newTagPlaceholder')"
        data-testid="tag-picker-input"
        @keydown.enter.prevent="create"
      />
      <AppButton
        variant="secondary"
        size="small"
        :disabled="disabled || newTagName.trim() === ''"
        data-testid="tag-picker-create"
        @click="create"
      >
        {{ t('tradeJournal.tagPicker.create') }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
.trade-tag-picker {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('2xs');
  }

  &__tag {
    border: 1px solid color('border-strong');
    border-radius: radius('sm');
    background-color: transparent;
    cursor: pointer;
    padding: spacing('3xs') spacing('xs');
    color: color('text');
    font-size: font-size('xs');

    &--selected {
      border-color: color('primary');
      background-color: color('primary-soft');
      color: color('text-strong');
    }

    &:disabled {
      cursor: not-allowed;
    }

    &:focus-visible {
      @include focus-ring;
    }
  }

  &__create {
    display: flex;
    gap: spacing('xs');
    max-width: 20rem;
  }
}
</style>
