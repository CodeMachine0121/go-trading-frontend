<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import FormField from '~/components/molecules/FormField.vue'
import { WatchlistEntryDto } from '~/domain/models/dto/watchlist-entry-dto'
import { MARKETS, type MarketValue } from '~/domain/models/vo/market-vo'

/**
 * 分子：把一檔加進觀察清單的那一組輸入。
 *
 * 代號**不邊打邊查**。打字途中的每一個前綴在市場那邊都是「找不到」，
 * 畫面會一路閃紅字；而且每按一次鍵就向行情來源問一次，會撞上它的用量上限。
 * 所以只在送出時問一次。
 */
const { submitting = false, errorMessage = null } = defineProps<{
  submitting?: boolean
  errorMessage?: string | null
}>()

const emit = defineEmits<{ add: [entry: WatchlistEntryDto] }>()

const firstMarket = MARKETS[0]!
const market = ref<MarketValue>(firstMarket.value)
const symbol = ref('')
const blankSymbol = ref(false)

function submit() {
  const trimmedSymbol = symbol.value.trim()

  // 空白就地擋下。付一趟往返來發現什麼都沒填，是白付的。
  blankSymbol.value = trimmedSymbol === ''
  if (blankSymbol.value) {
    return
  }

  emit('add', new WatchlistEntryDto(trimmedSymbol, market.value))
  symbol.value = ''
}
</script>

<template>
  <form
    class="watchlist-entry-form"
    @submit.prevent="submit"
  >
    <FormField label="市場">
      <AppSelect
        v-model="market"
        data-testid="watchlist-market"
      >
        <option
          v-for="option in MARKETS"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </AppSelect>
    </FormField>

    <FormField
      label="代號"
      :error-message="blankSymbol ? '請填入代號' : errorMessage"
    >
      <AppInput
        v-model="symbol"
        placeholder="2330"
        :invalid="blankSymbol || Boolean(errorMessage)"
        data-testid="watchlist-symbol"
      />
    </FormField>

    <AppButton
      type="submit"
      :disabled="submitting"
      data-testid="watchlist-add"
    >
      {{ submitting ? '確認中…' : '加入' }}
    </AppButton>
  </form>
</template>

<style scoped lang="scss">
.watchlist-entry-form {
  display: flex;
  align-items: flex-end;
  gap: spacing('sm');
  flex-wrap: wrap;
}
</style>
