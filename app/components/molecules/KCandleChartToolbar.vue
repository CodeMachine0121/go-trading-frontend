<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import SymbolField from '~/components/molecules/SymbolField.vue'
import type { TradingSymbolDto } from '~/domain/models/dto/trading-symbol-dto'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import type { KCandleChartRangePresetDto } from '~/domain/models/dto/k-candle-chart-range-preset-dto'
import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'

// 分子：圖表上方那一排——看哪一檔、看多長、看多細、怎麼畫。
//
// 這裡只放「使用者按得動的東西」。**「我要多細」按得動，「這一批實際多細」按不動**：
// 後者是系統回報的結果，跟著圖走（寫在圖那塊面板的標題列上），不混進控制項裡。
// 兩者共用「每根涵蓋」這個名字，因為它們就是同一件事的兩面。
const {
  tradingSymbolApplication, presets, activePresetLabel = null,
  aggregationIntervalChoices, activeAggregationIntervalChoice,
  drawing, loading = false, symbolError = null,
} = defineProps<{
  tradingSymbolApplication: TradingSymbolApplication
  presets: KCandleChartRangePresetDto[]
  activePresetLabel?: string | null
  aggregationIntervalChoices: AggregationIntervalChoiceDto[]
  activeAggregationIntervalChoice: AggregationIntervalChoiceDto
  drawing: 'candlestick' | 'line'
  loading?: boolean
  symbolError?: string | null
}>()

const emit = defineEmits<{
  'selectPreset': [preset: KCandleChartRangePresetDto]
  'selectAggregationIntervalChoice': [choice: AggregationIntervalChoiceDto]
  'update:drawing': [drawing: 'candlestick' | 'line']
  // 挑標的那個欄位已經握有清單，選著的是哪一檔由它說；這裡只是轉一手，
  // 因為圖表那一層才是需要知道「這一檔會不會收盤、有沒有即時更新」的人。
  'selected': [tradingSymbol: TradingSymbolDto | null]
}>()

/**
 * 下拉選單認得的是字串，而上一層要的是那個選擇本身。
 *
 * 換回來一律從 `aggregationIntervalChoices` 裡找，而不是就地新建一個：
 * 選擇是誰由那份清單說了算，這裡只負責把使用者點到的那一項還原成它。
 * 找不到就什麼都不做——那代表清單與選單的值對不起來，改成硬送一個
 * 「自動」會讓那個 bug 看起來像使用者自己選的。
 */
const selectedAggregationIntervalValue = computed({
  get: () => activeAggregationIntervalChoice.value,
  set: (selectedValue: string) => {
    const choice = aggregationIntervalChoices.find(
      candidate => candidate.value === selectedValue)

    if (choice !== undefined) {
      emit('selectAggregationIntervalChoice', choice)
    }
  },
})

const symbol = defineModel<string>('symbol', { required: true })

const DRAWINGS: { value: 'candlestick' | 'line', label: string }[] = [
  { value: 'candlestick', label: '蠟燭' },
  { value: 'line', label: '曲線' },
]
</script>

<template>
  <div class="k-candle-chart-toolbar">
    <SymbolField
      v-model="symbol"
      :trading-symbol-application="tradingSymbolApplication"
      :error-message="symbolError"
      class="k-candle-chart-toolbar__symbol"
      @selected="emit('selected', $event)"
    />

    <div class="k-candle-chart-toolbar__group">
      <span class="k-candle-chart-toolbar__group-label">看多長</span>
      <div class="k-candle-chart-toolbar__buttons">
        <AppButton
          v-for="preset in presets"
          :key="preset.label"
          :variant="preset.label === activePresetLabel ? 'primary' : 'ghost'"
          size="small"
          :disabled="loading"
          data-testid="range-preset-button"
          @click="emit('selectPreset', preset)"
        >
          {{ preset.label }}
        </AppButton>
      </div>
    </div>

    <!--
      這一組是下拉而不是連在一起的按鈕軌道：它與指標計算面板上那個挑粗細的選單
      是同一件事，用同一種形式，使用者不必學第二套。
    -->
    <div class="k-candle-chart-toolbar__group">
      <span class="k-candle-chart-toolbar__group-label">每根涵蓋</span>
      <AppSelect
        v-model="selectedAggregationIntervalValue"
        class="k-candle-chart-toolbar__interval"
        :disabled="loading"
        data-testid="aggregation-interval-choice-select"
      >
        <option
          v-for="choice in aggregationIntervalChoices"
          :key="choice.value"
          :value="choice.value"
        >
          {{ choice.label }}
        </option>
      </AppSelect>
    </div>

    <div class="k-candle-chart-toolbar__group">
      <span class="k-candle-chart-toolbar__group-label">畫法</span>
      <div class="k-candle-chart-toolbar__buttons">
        <AppButton
          v-for="option in DRAWINGS"
          :key="option.value"
          :variant="option.value === drawing ? 'primary' : 'ghost'"
          size="small"
          data-testid="drawing-button"
          @click="emit('update:drawing', option.value)"
        >
          {{ option.label }}
        </AppButton>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.k-candle-chart-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: spacing('sm') spacing('lg');

  // 從上面對齊：每一組的標籤因此排成一條線，控制項也跟著排成一條線。
  // 靠底部對齊的話，帶說明文字的那一欄會把其他組往下拉。
  align-items: flex-start;

  &__symbol {
    min-width: 10rem;
    max-width: 14rem;
  }

  &__group {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
  }

  &__group-label {
    @include dense-label;
  }

  // 五個中文標籤都很短，讓它跟著內容寬就好——撐滿一整排會讓它看起來
  // 比旁邊那兩組重要，而它們是同一級的選擇。
  &__interval {
    width: auto;
    min-width: 6rem;
  }

  // 一組互斥的選擇擺成一條連在一起的軌道，而不是幾顆各自獨立的按鈕——
  // 連在一起才看得出「只能選一個」，這也是每一台交易終端機講區間的方式。
  // 這一排的選項多到窄螢幕擺不完，所以它折行，而不是把整條軌道推出畫面外。
  &__buttons {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('3xs');
    border: 1px solid color('border');
    border-radius: radius('md');
    background-color: color('background');
    padding: spacing('3xs');
  }
}
</style>
