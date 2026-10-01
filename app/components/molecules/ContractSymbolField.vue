<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppSelect from '~/components/atoms/AppSelect.vue'
import FormField from '~/components/molecules/FormField.vue'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import type { ContractTradingSymbolDto } from '~/domain/models/dto/contract-trading-symbol-dto'

/**
 * 分子：挑一個合約標的。
 *
 * 它與挑現貨標的那一格（SymbolField）是**兩份不同的清單**，所以是兩個欄位：
 * 同一個名字在兩條線上是兩個商品，合約那邊的 SHIB 甚至叫另一個名字，
 * 從現貨的清單挑合約會挑到一個合約那邊根本沒有的東西。
 *
 * 選項從哪來、載入中與取不到怎麼說，都收在這裡——與 SymbolField 同一個理由：
 * 使用端只要給 v-model 與 Application，不必各自處理一次。
 * 沒有市場鍵：合約都在同一個全天候的市場。
 */
const {
  tradingSymbolApplication, errorMessage = null, watchedOnly = false, keepsSelection = false,
} = defineProps<{
  tradingSymbolApplication: TradingSymbolApplication
  errorMessage?: string | null
  /** 只列合約追蹤名單上的——合約機器人只盯正在追蹤的合約。 */
  watchedOnly?: boolean
  /** 目前這一個不在清單上也不改選——改一台已存的機器人時，它盯的合約不能被悄悄換掉。 */
  keepsSelection?: boolean
}>()

const symbol = defineModel<string>({ required: true })

const { t } = useI18n()

const contractTradingSymbols = ref<ContractTradingSymbolDto[]>([])

/**
 * 目前選著的那一個合約標的的完整樣子——含它在不在合約追蹤名單上。不在清單上時是 null。
 *
 * 它從這裡發出去，而不是讓使用端自己再取一次清單，與 SymbolField 同一個理由：
 * 清單已經在這個元件手上了，取第二次是同一份資料的第二個版本。
 */
const emit = defineEmits<{ selected: [ContractTradingSymbolDto | null] }>()

watch([symbol, contractTradingSymbols], () => {
  emit('selected', contractTradingSymbols.value.find(
    contractTradingSymbol => contractTradingSymbol.symbol === symbol.value) ?? null)
})
const loading = ref(true)
const unavailable = ref(false)

const options = computed(() => tradingSymbolApplication.contractOptionsFor(
  contractTradingSymbols.value, symbol.value, watchedOnly, keepsSelection))

const hint = computed(() => {
  if (loading.value) {
    return t('marketData.contractSymbolField.loading')
  }
  if (unavailable.value) {
    return t('marketData.contractSymbolField.unavailable')
  }
  if (options.value.hasNone) {
    return t('marketData.contractSymbolField.none')
  }

  return watchedOnly
    ? t('marketData.contractSymbolField.watchedOnlyHint')
    : t('marketData.contractSymbolField.allHint')
})

onMounted(async () => {
  try {
    contractTradingSymbols.value = await tradingSymbolApplication.listContractTradingSymbols()

    // 目前這一個不在清單上就改選——挑誰由 domain 說（清單是空的時它說維持原樣）。
    symbol.value = options.value.selectedSymbol
  }
  catch {
    // 取不到清單不是使用者能修正的事，也不該讓整個畫面停住——
    // 說明它取不到，目前那一個照樣顯示著。
    unavailable.value = true
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <FormField
    :label="t('marketData.contractSymbolField.label')"
    :hint="hint"
    :error-message="errorMessage"
    class="contract-symbol-field"
  >
    <AppSelect
      v-model="symbol"
      :disabled="options.options.length === 0"
      :invalid="Boolean(errorMessage)"
      data-testid="contract-symbol-select"
    >
      <!-- 目前這一個不在清單上（清單空的或取不到）時仍要看得見它是哪一個。 -->
      <option
        v-if="!options.options.some(contractTradingSymbol => contractTradingSymbol.symbol === symbol)"
        :value="symbol"
      >
        {{ symbol === ''
          ? t('marketData.contractSymbolField.noOptions')
          : watchedOnly ? t('marketData.contractSymbolField.notOnWatchlist', { symbol }) : symbol }}
      </option>
      <option
        v-for="contractTradingSymbol in options.options"
        :key="contractTradingSymbol.symbol"
        :value="contractTradingSymbol.symbol"
      >
        {{ contractTradingSymbol.isWatched
          ? contractTradingSymbol.symbol
          : t('marketData.contractSymbolField.notWatched', { symbol: contractTradingSymbol.symbol }) }}
      </option>
    </AppSelect>
  </FormField>
</template>

<style scoped lang="scss">
.contract-symbol-field {
  min-width: 0;
}
</style>
