<script setup lang="ts">
import AppSelect from '~/components/atoms/AppSelect.vue'
import FormField from '~/components/molecules/FormField.vue'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import type { TradingSymbolDto } from '~/domain/models/dto/trading-symbol-dto'

/**
 * 分子：挑一個交易標的。
 *
 * 「怎麼挑一個交易標的」在這個操作台上只有一種樣子，而三個讀行情的畫面都要它——
 * 所以連「選項從哪來」都收在這個元件裡。使用端只要給 v-model 與 Application，
 * 不必各自去取清單、各自處理載入中與取不到，那份重複會有三份而且會慢慢長歪。
 *
 * **這裡只用於讀行情。** 新增／修改 K 線的表單維持手打——
 * 那正是新的交易標的誕生的地方，只能從既有清單挑的話就永遠建不出第一根。
 */
const { tradingSymbolApplication, errorMessage = null } = defineProps<{
  tradingSymbolApplication: TradingSymbolApplication
  errorMessage?: string | null
}>()

const symbol = defineModel<string>({ required: true })

const tradingSymbols = ref<TradingSymbolDto[]>([])
const loading = ref(true)
const unavailable = ref(false)

const hint = computed(() => {
  if (loading.value) {
    return '取交易標的清單中…'
  }
  if (unavailable.value) {
    return '取不到交易標的清單，請確認後端已啟動'
  }
  if (tradingSymbols.value.length === 0) {
    return '後端目前沒有任何交易標的'
  }

  return '只列出後端已經有 K 線的交易標的'
})

onMounted(async () => {
  try {
    tradingSymbols.value = await tradingSymbolApplication.listTradingSymbols()

    // 目前這一檔不在清單上時改選第一個——盯著一個查不出東西、也選不掉的名字最沒有用。
    // 清單是空的則維持原樣：清空欄位會變成「請指定交易標的」，
    // 那是在怪使用者沒填，但真正的原因是後端還沒有任何資料。
    const listed = tradingSymbols.value.some(
      tradingSymbol => tradingSymbol.symbol === symbol.value)
    const firstTradingSymbol = tradingSymbols.value[0]
    if (!listed && firstTradingSymbol !== undefined) {
      symbol.value = firstTradingSymbol.symbol
    }
  }
  catch {
    // 取不到清單不是使用者能修正的事，也不該讓整個畫面停住——
    // 說明它取不到，目前那一檔照樣顯示著。
    unavailable.value = true
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <FormField
    label="交易標的"
    :hint="hint"
    :error-message="errorMessage"
  >
    <AppSelect
      v-model="symbol"
      :disabled="tradingSymbols.length === 0"
      :invalid="Boolean(errorMessage)"
      data-testid="symbol-select"
    >
      <!-- 目前這一檔不在清單上（清單空的或取不到）時仍要看得見它是哪一檔 -->
      <option
        v-if="!tradingSymbols.some(tradingSymbol => tradingSymbol.symbol === symbol)"
        :value="symbol"
      >
        {{ symbol }}
      </option>
      <option
        v-for="tradingSymbol in tradingSymbols"
        :key="tradingSymbol.symbol"
        :value="tradingSymbol.symbol"
      >
        {{ tradingSymbol.symbol }}
      </option>
    </AppSelect>
  </FormField>
</template>
