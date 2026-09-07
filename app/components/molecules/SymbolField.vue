<script setup lang="ts">
import AppSelect from '~/components/atoms/AppSelect.vue'
import AppTabs from '~/components/atoms/AppTabs.vue'
import FormField from '~/components/molecules/FormField.vue'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import type { TradingSymbolDto } from '~/domain/models/dto/trading-symbol-dto'
import { MARKETS, type MarketValue } from '~/domain/models/vo/market-vo'

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

/**
 * 目前選著的那一檔的完整樣子，交給需要它的使用端。
 *
 * 它從這裡發出去，而不是讓使用端自己再取一次清單：清單已經在這個元件手上了，
 * 取第二次是同一份資料的第二個版本，兩份遲早會對不起來。
 */
const emit = defineEmits<{ selected: [TradingSymbolDto | null] }>()

watch([symbol, tradingSymbols], () => {
  emit('selected', tradingSymbols.value.find(
    tradingSymbol => tradingSymbol.symbol === symbol.value) ?? null)
})
const loading = ref(true)
const unavailable = ref(false)

/**
 * 只看哪一個市場。`ALL_MARKETS` 的意思是不篩。
 *
 * 它是這個欄位自己的狀態，不往外送：使用端要的是「選了哪一檔」，
 * 而使用者用什麼角度找到它，是他自己的事。
 */
const ALL_MARKETS = 'all'
const selectedMarket = ref<MarketValue | typeof ALL_MARKETS>(ALL_MARKETS)

const MARKET_TABS = [
  { value: ALL_MARKETS, label: '全部' },
  ...MARKETS.map(market => ({ value: market.value, label: market.label })),
]

/**
 * 這一次該列出來的那幾檔，以及這個市場是不是根本沒有東西。
 *
 * 篩選在這一側完成而不是重新向後端要一次：清單已經在手上了，
 * 每按一次切換就再問一次，是同一份資料的第二個版本。
 */
const options = computed(() => tradingSymbolApplication.optionsFor(
  tradingSymbols.value,
  selectedMarket.value === ALL_MARKETS ? null : selectedMarket.value,
  symbol.value,
))

/**
 * 換市場就換到那個市場的標的上。
 *
 * 市場鍵的意思是「我現在要看哪個市場」，所以留著一檔別的市場的標的等於讓畫面
 * 說謊：分頁寫著台股，圖上畫的是比特幣。那個市場沒得選時就空著——
 * 空著看得出「這裡還沒有東西」，比留一檔對不上的誠實。
 *
 * 只在**使用者換市場**時動它。掛載時清單還在路上，那時動它會把預設那一檔清掉。
 */
watch(selectedMarket, () => {
  symbol.value = options.value.selectedSymbol
})

const hint = computed(() => {
  if (loading.value) {
    return '取交易標的清單中…'
  }
  if (unavailable.value) {
    return '取不到交易標的清單，請確認後端已啟動'
  }
  if (options.value.hasNoneInMarket) {
    return selectedMarket.value === ALL_MARKETS
      ? '後端目前沒有任何交易標的'
      : '這個市場目前沒有任何交易標的，請先到觀察清單加入一檔'
  }

  // 每一檔的市場與有沒有即時更新寫在選項自己身上，這一句只說這份清單是什麼。
  return '後端認得的每一個交易標的；標示了市場與有沒有即時更新'
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
  <div class="symbol-field">
    <!--
      切換鍵在欄位外面，不在裡面：FormField 用一個 <label> 把控制項包起來，
      而一顆按鈕放進 <label> 就會連帶去操作那個被標示的控制項。
      這幾顆按鈕決定的是「選單上有哪些選項」，本來就不屬於那個標示。
    -->
    <AppTabs
      v-model="selectedMarket"
      :options="MARKET_TABS"
      class="symbol-field__markets"
    />

    <FormField
      label="交易標的"
      :hint="hint"
      :error-message="errorMessage"
    >
      <AppSelect
        v-model="symbol"
        :disabled="options.options.length === 0"
        :invalid="Boolean(errorMessage)"
        data-testid="symbol-select"
      >
        <!--
          目前這一檔不在清單上（清單空的或取不到）時仍要看得見它是哪一檔；
          連一檔都沒選著時，那一格要說出「這裡沒有東西可挑」，而不是留一片空白，
          因為空白看起來像壞了。
        -->
        <option
          v-if="!options.options.some(tradingSymbol => tradingSymbol.symbol === symbol)"
          :value="symbol"
        >
          {{ symbol === '' ? '（沒有可選的標的）' : symbol }}
        </option>
        <!--
          市場與有沒有即時更新都寫在選項文字裡：原生的 option 裝不下一個元件，
          而這兩件事必須在**挑之前**就看得到——挑完才發現這一檔不會動，
          那個資訊就來得太晚了。
        -->
        <option
          v-for="tradingSymbol in options.options"
          :key="tradingSymbol.symbol"
          :value="tradingSymbol.symbol"
        >
          {{ tradingSymbol.label }}
          · {{ tradingSymbol.market.label }}{{ tradingSymbol.hasLiveUpdates ? '' : '（無即時更新）' }}
        </option>
      </AppSelect>
    </FormField>
  </div>
</template>

<style scoped lang="scss">
.symbol-field {
  display: flex;
  flex-direction: column;
  gap: spacing('3xs');
  min-width: 0;

  &__markets {
    // 這一排是「看哪個市場」，底下那格是「看哪一檔」——兩件事，所以中間留一口氣。
    margin-bottom: spacing('3xs');
  }
}
</style>
