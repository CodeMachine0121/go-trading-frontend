<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import SymbolField from '~/components/molecules/SymbolField.vue'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import type { KCandleChartRangePresetDto } from '~/domain/models/dto/k-candle-chart-range-preset-dto'

// 分子：圖表上方那一排——看哪一檔、看多長、怎麼畫。
//
// 這裡只放「使用者按得動的東西」。每根涵蓋多久是唯讀的推導結果，不是選項，
// 所以它跟著圖走（寫在圖那塊面板的標題列上），不混在控制項裡假裝自己可以選。
const {
  tradingSymbolApplication, presets, activePresetLabel = null,
  drawing, loading = false, symbolError = null,
} = defineProps<{
  tradingSymbolApplication: TradingSymbolApplication
  presets: KCandleChartRangePresetDto[]
  activePresetLabel?: string | null
  drawing: 'candlestick' | 'line'
  loading?: boolean
  symbolError?: string | null
}>()

const emit = defineEmits<{
  'selectPreset': [preset: KCandleChartRangePresetDto]
  'update:drawing': [drawing: 'candlestick' | 'line']
}>()

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

  // 一組互斥的選擇擺成一條連在一起的軌道，而不是幾顆各自獨立的按鈕——
  // 連在一起才看得出「只能選一個」，這也是每一台交易終端機講區間的方式。
  &__buttons {
    display: flex;
    gap: spacing('3xs');
    border: 1px solid color('border');
    border-radius: radius('md');
    background-color: color('background');
    padding: spacing('3xs');
  }
}
</style>
