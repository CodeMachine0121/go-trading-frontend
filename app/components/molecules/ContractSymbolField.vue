<script setup lang="ts">
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
const { tradingSymbolApplication, errorMessage = null } = defineProps<{
  tradingSymbolApplication: TradingSymbolApplication
  errorMessage?: string | null
}>()

const symbol = defineModel<string>({ required: true })

const contractTradingSymbols = ref<ContractTradingSymbolDto[]>([])
const loading = ref(true)
const unavailable = ref(false)

const options = computed(() => tradingSymbolApplication.contractOptionsFor(
  contractTradingSymbols.value, symbol.value))

const hint = computed(() => {
  if (loading.value) {
    return '取合約標的清單中…'
  }
  if (unavailable.value) {
    return '取不到合約標的清單，請確認後端已啟動'
  }
  if (options.value.hasNone) {
    return '目前沒有任何合約標的，先把合約加進合約追蹤名單'
  }

  return '合約那一邊認得的每一個標的；沒在追蹤的也列著'
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
    label="合約標的"
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
        {{ symbol === '' ? '（沒有可選的合約）' : symbol }}
      </option>
      <option
        v-for="contractTradingSymbol in options.options"
        :key="contractTradingSymbol.symbol"
        :value="contractTradingSymbol.symbol"
      >
        {{ contractTradingSymbol.symbol }}{{ contractTradingSymbol.isWatched ? '' : '（未追蹤）' }}
      </option>
    </AppSelect>
  </FormField>
</template>

<style scoped lang="scss">
.contract-symbol-field {
  min-width: 0;
}
</style>
