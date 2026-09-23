<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { KCandleChartRangePresetDto } from '~/domain/models/dto/k-candle-chart-range-preset-dto'
import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'

// 分子：圖表上方那一排——看哪一檔、看多長、看多細、怎麼畫。
//
// 這裡只放「使用者按得動的東西」。**「我要多細」按得動，「這一批實際多細」按不動**：
// 後者是系統回報的結果，跟著圖走（寫在圖那塊面板的標題列上），不混進控制項裡。
// 兩者共用「每根涵蓋」這個名字，因為它們就是同一件事的兩面。
//
// 挑標的那一格由使用端放進 `symbol` 插槽：現貨從現貨的清單挑、合約從合約的清單挑，
// 而看多長、每根涵蓋、畫法這一排兩條線一模一樣。
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

defineSlots<{ symbol: () => unknown }>()

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
    <div class="k-candle-chart-toolbar__symbol">
      <slot name="symbol" />
    </div>

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
      這一組是下拉而不是連在一起的按鈕軌道：它與策略腳本畫面上那個挑粗細的選單
      是同一件事，用同一種形式，使用者不必學第二套。

      它是 <label> 而不是 <div>，另外兩組不是：另外兩組裝的是一排按鈕，
      每顆按鈕自己說得出自己叫什麼；下拉選單說不出來——包起來，
      「每根涵蓋」才會成為它的名字（讀螢幕的人聽得到，點那四個字也能打開它）。
    -->
    <div class="k-candle-chart-toolbar__pair">
      <label class="k-candle-chart-toolbar__group">
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
      </label>

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
  </div>
</template>

<style scoped lang="scss">
.k-candle-chart-toolbar {
  display: flex;

  // 窄螢幕：一組一行，由上往下。橫著擠的話，五個區間的按鈕會折成兩排，
  // 而一排折了行的「軌道」看起來就不再是一條軌道。
  flex-direction: column;
  gap: spacing('sm');

  @include respond-to('md') {
    flex-flow: row wrap;
    gap: spacing('sm') spacing('lg');

    // 從上面對齊：每一組的標籤因此排成一條線，控制項也跟著排成一條線。
    // 靠底部對齊的話，帶說明文字的那一欄會把其他組往下拉。
    align-items: flex-start;
  }

  &__symbol {
    @include respond-to('md') {
      min-width: min(10rem, 100%);
      max-width: 14rem;
    }
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
    min-width: min(6rem, 100%);
  }

  // 窄螢幕上「每根涵蓋」與「畫法」併成一行：兩者都是一次挑一個的小選擇，
  // 各佔一整行會把圖往下推兩格，而圖才是這一頁的主角。
  &__pair {
    display: flex;
    gap: spacing('sm');

    > * {
      flex: 1;
      min-width: 0;
    }

    // 寬螢幕上這一層整個讓開，於是它那兩個孩子變成工具列的直接成員——
    // 那時候 `flex: 1` 會讓它們撐滿整排，而旁邊兩組維持內容寬，看起來就歪了。
    // 讓開的同時也要把那條規則收回去。
    @include respond-to('md') {
      display: contents;

      > * {
        flex: 0 1 auto;
      }
    }
  }

  // 一組互斥的選擇擺成一條連在一起的軌道，而不是幾顆各自獨立的按鈕——
  // 連在一起才看得出「只能選一個」，這也是每一台交易終端機講區間的方式。
  //
  // **窄螢幕上它橫著捲，不折行。** 折行的那一版是上一刀的作法，而它有兩個問題：
  // 一排折成兩排之後看起來是兩組東西，而且每次選中的那一顆換位置時整塊會跳高跳矮。
  // 橫著捲是手機上這排籌碼的既有作法（Revolut、Phantom、Stake 的 1D/1W/1M 都是），
  // 而且捲到哪裡都還看得到「還有更多」。
  &__buttons {
    display: flex;
    gap: spacing('3xs');
    border: 1px solid color('border');
    border-radius: radius('md');
    background-color: color('background');
    padding: spacing('3xs');
    overflow-x: auto;

    // 捲到底時最後一顆不要貼著邊，看起來才像「這裡結束了」。
    scroll-padding-inline: spacing('3xs');

    // 一顆一顆停，不會停在兩顆中間切一半。
    scroll-snap-type: x proximity;

    > * {
      flex: none;
      scroll-snap-align: start;
    }

    @include respond-to('md') {
      flex-wrap: wrap;
      overflow-x: visible;
    }
  }
}
</style>
