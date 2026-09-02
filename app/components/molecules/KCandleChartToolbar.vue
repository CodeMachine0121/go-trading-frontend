<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import FormField from '~/components/molecules/FormField.vue'
import type { KCandleChartRangePresetDto } from '~/domain/models/dto/k-candle-chart-range-preset-dto'

// 分子：圖表上方那一排——看哪一檔、看多長、怎麼畫，以及目前每根涵蓋多久。
// 每根涵蓋多久是唯讀的：它是「正在看多長」推出來的結果，不是使用者能直接選的東西。
const { presets, activePresetLabel = null, intervalLabel, drawing, loading = false, symbolError = null }
  = defineProps<{
    presets: KCandleChartRangePresetDto[]
    activePresetLabel?: string | null
    intervalLabel: string
    drawing: 'candlestick' | 'line'
    loading?: boolean
    symbolError?: string | null
  }>()

const emit = defineEmits<{
  'selectPreset': [preset: KCandleChartRangePresetDto]
  'update:drawing': [drawing: 'candlestick' | 'line']
}>()

const symbol = defineModel<string>('symbol', { required: true })

/** 後端觀察清單上的常用標的，只是快速選取，使用者仍可自行輸入其他標的。 */
const SUGGESTED_SYMBOLS = ['BTCUSDT', 'ETHUSDT']

const DRAWINGS: { value: 'candlestick' | 'line', label: string }[] = [
  { value: 'candlestick', label: '蠟燭' },
  { value: 'line', label: '曲線' },
]
</script>

<template>
  <div class="k-candle-chart-toolbar">
    <FormField
      label="交易標的"
      hint="例如 BTCUSDT"
      :error-message="symbolError"
      class="k-candle-chart-toolbar__symbol"
    >
      <AppInput
        v-model="symbol"
        type="text"
        list="k-candle-chart-toolbar-symbols"
        placeholder="BTCUSDT"
        :invalid="Boolean(symbolError)"
        data-testid="symbol-input"
      />
    </FormField>

    <datalist id="k-candle-chart-toolbar-symbols">
      <option
        v-for="suggestedSymbol in SUGGESTED_SYMBOLS"
        :key="suggestedSymbol"
        :value="suggestedSymbol"
      />
    </datalist>

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

    <div class="k-candle-chart-toolbar__group">
      <span class="k-candle-chart-toolbar__group-label">每根涵蓋</span>
      <AppBadge
        variant="info"
        data-testid="interval-label"
      >
        {{ intervalLabel }}
      </AppBadge>
    </div>
  </div>
</template>

<style scoped lang="scss">
.k-candle-chart-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: spacing('lg');
  align-items: flex-end;

  &__symbol {
    min-width: 12rem;
  }

  &__group {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
  }

  &__group-label {
    color: color('text-muted');
    font-size: font-size('xs');
  }

  &__buttons {
    display: flex;
    gap: spacing('2xs');
  }
}
</style>
