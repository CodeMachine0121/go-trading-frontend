<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { KCandleChartRangePresetDto } from '~/domain/models/dto/k-candle-chart-range-preset-dto'
import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'

// 分子：圖上方那一條工具列——看多長、看多細、怎麼畫。
//
// 這裡只放「使用者按得動的東西」。**「我要多細」按得動，「這一批實際多細」按不動**：
// 後者是系統回報的結果，跟著圖走（寫在圖那張卡片的標題列上），不混進控制項裡。
// 兩者共用「每根涵蓋」這個名字，因為它們就是同一件事的兩面。
//
// 看哪一檔不在這一條上：它是「看什麼」的一部分，擺在旁邊那一欄；
// 這一條只管同一檔要怎麼看，所以現貨與合約兩條線一模一樣。
const {
  presets, activePresetLabel = null,
  aggregationIntervalChoices, activeAggregationIntervalChoice,
  drawing, loading = false,
} = defineProps<{
  presets: KCandleChartRangePresetDto[]
  activePresetLabel?: string | null
  aggregationIntervalChoices: AggregationIntervalChoiceDto[]
  activeAggregationIntervalChoice: AggregationIntervalChoiceDto
  drawing: 'candlestick' | 'line'
  loading?: boolean
}>()

const emit = defineEmits<{
  'selectPreset': [preset: KCandleChartRangePresetDto]
  'selectAggregationIntervalChoice': [choice: AggregationIntervalChoiceDto]
  'update:drawing': [drawing: 'candlestick' | 'line']
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

const DRAWINGS: { value: 'candlestick' | 'line', label: string }[] = [
  { value: 'candlestick', label: '蠟燭' },
  { value: 'line', label: '曲線' },
]
</script>

<template>
  <div class="k-candle-chart-toolbar">
    <!--
      一組互斥的選擇擺成一條連在一起的軌道，而不是幾顆各自獨立的按鈕——
      連在一起才看得出「只能選一個」，這也是每一台交易終端機講區間的方式。
    -->
    <div
      class="k-candle-chart-toolbar__rail k-candle-chart-toolbar__rail--presets"
      role="group"
      aria-label="看多長"
    >
      <AppButton
        v-for="preset in presets"
        :key="preset.label"
        :variant="preset.label === activePresetLabel ? 'primary' : 'ghost'"
        size="small"
        :disabled="loading"
        :aria-pressed="preset.label === activePresetLabel"
        data-testid="range-preset-button"
        @click="emit('selectPreset', preset)"
      >
        {{ preset.label }}
      </AppButton>
    </div>

    <span
      class="k-candle-chart-toolbar__separator"
      aria-hidden="true"
    />

    <!--
      這一組是下拉而不是連在一起的按鈕軌道：它與策略腳本畫面上那個挑粗細的選單
      是同一件事，用同一種形式，使用者不必學第二套。

      它是 <label>：下拉選單說不出自己叫什麼——包起來，
      「每根涵蓋」才會成為它的名字（讀螢幕的人聽得到，點那四個字也能打開它）。
    -->
    <label class="k-candle-chart-toolbar__field">
      <span class="k-candle-chart-toolbar__field-label">每根涵蓋</span>
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
    </label>

    <div
      class="k-candle-chart-toolbar__rail"
      role="group"
      aria-label="畫法"
    >
      <AppButton
        v-for="option in DRAWINGS"
        :key="option.value"
        :variant="option.value === drawing ? 'primary' : 'ghost'"
        size="small"
        :aria-pressed="option.value === drawing"
        data-testid="drawing-button"
        @click="emit('update:drawing', option.value)"
      >
        {{ option.label }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
.k-candle-chart-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: spacing('xs');
  align-items: center;

  // 手機上看多長那一排獨佔一行、橫著捲，另外兩樣併在下一行。
  &__rail--presets {
    flex: 1 1 100%;

    @include respond-to('md') {
      flex: 0 1 auto;
    }
  }

  &__rail {
    display: flex;
    gap: spacing('3xs');
    border-radius: radius('sm');
    background-color: color('surface-muted');
    padding: spacing('3xs');
    min-width: 0;

    // **窄螢幕上它橫著捲，不折行。** 折成兩排之後看起來是兩組東西，
    // 而且每次選中的那一顆換位置時整塊會跳高跳矮。
    overflow-x: auto;
    scroll-snap-type: x proximity;
    scroll-padding-inline: spacing('3xs');

    > * {
      flex: none;
      scroll-snap-align: start;
    }
  }

  &__separator {
    display: none;

    @include respond-to('md') {
      display: block;
      background-color: color('border');
      width: 1px;
      height: spacing('lg');
    }
  }

  &__field {
    display: flex;
    flex: 1;
    gap: spacing('2xs');
    align-items: center;
    min-width: 0;

    @include respond-to('md') {
      flex: none;
    }
  }

  &__field-label {
    @include dense-label;

    white-space: nowrap;
  }

  // 中文標籤都很短，讓它跟著內容寬就好。
  &__interval {
    width: auto;
    min-width: min(6rem, 100%);
  }
}
</style>
