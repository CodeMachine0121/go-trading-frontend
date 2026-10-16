<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppModal from '~/components/atoms/AppModal.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import type { SymbolSearchOptionDto } from '~/domain/models/dto/symbol-search-option-dto'

/**
 * 分子：商品搜尋，照 TradingView 的樣子——上方細邊那一顆「代號＋放大鏡」，
 * 按下去打開搜尋：打字篩選、上下鍵挑、Enter 選定。
 *
 * 它只負責「在給它的那幾列裡找」：哪幾檔可以挑、每一列怎麼說、按鈕上寫什麼，由使用它的欄位決定。
 * 開關、打開時先放進搜尋框的字、鍵盤怎麼挑，全部收在這裡——
 * 現貨與合約兩個欄位因此只要交出清單、接住挑中的那一檔。
 */
const { options, symbolLabel, hint = '' } = defineProps<{
  options: readonly SymbolSearchOptionDto[]
  /** 按鈕上寫的那一檔。 */
  symbolLabel: string
  /** 滑過按鈕時的說明。 */
  hint?: string
}>()

const emit = defineEmits<{ pick: [symbol: string] }>()

const { t } = useI18n()

const open = ref(false)
const query = ref('')
const highlighted = ref(0)
const input = ref<HTMLInputElement | null>(null)

/** 打開商品搜尋；在圖上直接打字打開時，帶著那一個字。 */
async function openSearch(initialQuery = '') {
  query.value = initialQuery
  highlighted.value = 0
  open.value = true
  await nextTick()
  input.value?.focus()
}

function pick(symbol: string) {
  open.value = false
  emit('pick', symbol)
}

defineExpose({ openSearch })

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
      pick(option.symbol)
    }
  }
}
</script>

<template>
  <AppButton
    variant="chrome"
    class="symbol-search__button"
    :title="hint"
    data-testid="symbol-search-button"
    @click="openSearch()"
  >
    <span class="symbol-search__button-symbol">{{ symbolLabel }}</span>
    <AppIcon
      name="search"
      size="small"
      stroke="fine"
    />
  </AppButton>

  <AppModal
    :open="open"
    :title="t('marketData.chartWorkspace.symbolSearch')"
    @close="open = false"
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
            @click="pick(option.symbol)"
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
.symbol-search {
  &__button {
    font-size: font-size('md');
  }

  &__button-symbol {
    font-weight: font-weight('semibold');
  }
}

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
