<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppModal from '~/components/atoms/AppModal.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import type { SymbolSearchOptionDto } from '~/domain/models/dto/symbol-search-option-dto'

/**
 * 分子：商品搜尋，照 TradingView 的樣子——打字篩選、上下鍵挑、Enter 選定。
 *
 * 它只負責「在給它的那幾列裡找」：哪幾檔可以挑、每一列怎麼說，由使用它的欄位決定。
 * `#filters` 給那個欄位放自己的篩選（例如現貨的市場鍵）。
 */
const { open, options, initialQuery = '' } = defineProps<{
  open: boolean
  options: readonly SymbolSearchOptionDto[]
  /** 打開時搜尋框裡先放的字（在圖上直接打字打開時，就是那一個字）。 */
  initialQuery?: string
}>()

const emit = defineEmits<{
  pick: [symbol: string]
  close: []
}>()

const { t } = useI18n()

const query = ref('')
const highlighted = ref(0)
const input = ref<HTMLInputElement | null>(null)

watch(() => open, async (isOpen) => {
  if (!isOpen) {
    return
  }
  query.value = initialQuery
  highlighted.value = 0
  await nextTick()
  input.value?.focus()
}, { immediate: true })

const matching = computed(() => {
  const text = query.value.trim().toUpperCase()

  return text === ''
    ? options
    : options.filter(option => option.symbol.toUpperCase().includes(text) || option.title.toUpperCase().includes(text))
})

watch(matching, () => {
  highlighted.value = 0
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    highlighted.value = Math.min(highlighted.value + 1, matching.value.length - 1)
  }
  else if (event.key === 'ArrowUp') {
    event.preventDefault()
    highlighted.value = Math.max(highlighted.value - 1, 0)
  }
  else if (event.key === 'Enter') {
    const option = matching.value[highlighted.value]
    if (option !== undefined) {
      emit('pick', option.symbol)
    }
  }
}
</script>

<template>
  <AppModal
    :open="open"
    :title="t('marketData.chartWorkspace.symbolSearch')"
    @close="emit('close')"
  >
    <div class="symbol-search-dialog">
      <label class="symbol-search-dialog__search">
        <AppIcon
          name="search"
          stroke="fine"
        />
        <input
          ref="input"
          v-model="query"
          class="symbol-search-dialog__input"
          type="text"
          autocomplete="off"
          spellcheck="false"
          :placeholder="t('marketData.chartWorkspace.symbolSearchPlaceholder')"
          :aria-label="t('marketData.chartWorkspace.symbolSearch')"
          data-testid="symbol-search-input"
          @keydown="onKeydown"
        >
      </label>

      <slot name="filters" />

      <p
        v-if="matching.length === 0"
        class="symbol-search-dialog__empty"
        data-testid="symbol-search-empty"
      >
        {{ t('marketData.chartWorkspace.symbolSearchEmpty') }}
      </p>

      <ul
        v-else
        class="symbol-search-dialog__list"
        role="listbox"
      >
        <li
          v-for="(option, index) in matching"
          :key="option.symbol"
          role="option"
          :aria-selected="index === highlighted"
        >
          <button
            type="button"
            class="symbol-search-dialog__option"
            :class="{ 'symbol-search-dialog__option--highlighted': index === highlighted }"
            data-testid="symbol-search-option"
            @click="emit('pick', option.symbol)"
            @mouseenter="highlighted = index"
          >
            <span class="symbol-search-dialog__symbol">{{ option.symbol }}</span>
            <span class="symbol-search-dialog__title">{{ option.title }}</span>
            <span class="symbol-search-dialog__description">{{ option.description }}</span>
          </button>
        </li>
      </ul>
    </div>
  </AppModal>
</template>

<style scoped lang="scss">
.symbol-search-dialog {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');
  min-height: 0;

  &__search {
    display: flex;
    gap: spacing('xs');
    align-items: center;
    border-bottom: 1px solid color('border');
    padding-bottom: spacing('xs');
  }

  &__input {
    flex: 1;
    border: 0;
    background: none;
    min-width: 0;
    color: color('text-strong');
    font-size: font-size('md');
    outline: none;
  }

  &__empty {
    margin: 0;
    padding: spacing('md') 0;
    color: color('text-faint');
    font-size: font-size('sm');
  }

  &__list {
    margin: 0;
    padding: 0;
    max-height: 22rem;
    overflow-y: auto;
    list-style: none;
  }

  &__option {
    display: grid;
    grid-template-columns: minmax(0, 8rem) minmax(0, 1fr) auto;
    gap: spacing('sm');
    align-items: center;
    border: 0;
    border-radius: radius('sm');
    background: none;
    cursor: pointer;
    padding: spacing('xs') spacing('sm');
    width: 100%;
    color: color('text');
    font-size: font-size('sm');
    text-align: left;

    &--highlighted {
      background-color: color('surface-muted');
    }
  }

  &__symbol {
    color: color('text-strong');
    font-weight: font-weight('semibold');
  }

  &__title,
  &__description {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__description {
    color: color('text-faint');
    font-size: font-size('xs');
  }
}
</style>
