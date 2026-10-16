<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import { K_CANDLE_CHART_DRAWINGS, type KCandleChartDrawing } from '~/domain/models/vo/k-candle-chart-drawing-vo'

// 分子：看盤工作區上方細邊的中段——看多細、怎麼畫。照 TradingView 的樣子：
// 彙總刻度一顆一顆排開、選著的那一顆換成強調色；畫法收成一顆圖示，按下去展開四種。
//
// 這裡只放「使用者按得動的東西」。**「我要多細」按得動，「這一批實際多細」按不動**：
// 後者是系統回報的結果，寫在圖例上，跟著圖走。
// 看多長（快捷區間）不在這一條上，它在下方細邊。
const {
  aggregationIntervalChoices, activeAggregationIntervalChoice,
  drawing, loading = false,
} = defineProps<{
  aggregationIntervalChoices: AggregationIntervalChoiceDto[]
  activeAggregationIntervalChoice: AggregationIntervalChoiceDto
  drawing: KCandleChartDrawing
  loading?: boolean
}>()

const emit = defineEmits<{
  'selectAggregationIntervalChoice': [choice: AggregationIntervalChoiceDto]
  'update:drawing': [drawing: KCandleChartDrawing]
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()

/** 畫法對到哪一個圖示。 */
const DRAWING_ICONS: Record<KCandleChartDrawing, 'candles' | 'bars' | 'line-chart' | 'area-chart'> = {
  candlestick: 'candles',
  bar: 'bars',
  line: 'line-chart',
  area: 'area-chart',
}

const drawingMenuOpen = ref(false)

/** 細邊上寫得下的短說法；沒有短說法的那一種照它的全名寫。 */
const shortLabels = computed<Record<string, string>>(() => ({
  'auto': t('marketData.chartWorkspace.intervalShort.auto'),
  '1m': t('marketData.chartWorkspace.intervalShort.oneMinute'),
  '5m': t('marketData.chartWorkspace.intervalShort.fiveMinutes'),
  '15m': t('marketData.chartWorkspace.intervalShort.fifteenMinutes'),
  '1h': t('marketData.chartWorkspace.intervalShort.oneHour'),
}))

function shortLabelOf(choice: AggregationIntervalChoiceDto): string {
  return shortLabels.value[choice.value] ?? localize(choice.label)
}

function pickDrawing(nextDrawing: KCandleChartDrawing) {
  drawingMenuOpen.value = false
  emit('update:drawing', nextDrawing)
}
</script>

<template>
  <div class="k-candle-chart-toolbar">
    <div
      class="k-candle-chart-toolbar__intervals"
      role="group"
      :aria-label="t('marketData.kCandleChartToolbar.aggregationIntervalLabel')"
    >
      <AppButton
        v-for="choice in aggregationIntervalChoices"
        :key="choice.value"
        variant="chrome"
        size="small"
        class="k-candle-chart-toolbar__interval"
        :class="{ 'k-candle-chart-toolbar__interval--active': choice.value === activeAggregationIntervalChoice.value }"
        :title="localize(choice.label)"
        :aria-pressed="choice.value === activeAggregationIntervalChoice.value"
        :disabled="loading"
        :data-interval="choice.value"
        data-testid="aggregation-interval-choice-button"
        @click="emit('selectAggregationIntervalChoice', choice)"
      >
        {{ shortLabelOf(choice) }}
      </AppButton>
    </div>

    <span
      class="k-candle-chart-toolbar__separator"
      aria-hidden="true"
    />

    <div class="k-candle-chart-toolbar__drawing">
      <AppButton
        variant="chrome"
        size="small"
        :label="t('marketData.kCandleChartToolbar.drawingGroupLabel')"
        :aria-expanded="drawingMenuOpen"
        data-testid="drawing-menu-button"
        @click="drawingMenuOpen = !drawingMenuOpen"
      >
        <AppIcon
          :name="DRAWING_ICONS[drawing]"
          stroke="fine"
        />
      </AppButton>

      <div
        v-if="drawingMenuOpen"
        class="k-candle-chart-toolbar__menu"
        role="menu"
      >
        <button
          v-for="option in K_CANDLE_CHART_DRAWINGS"
          :key="option.value"
          type="button"
          role="menuitemradio"
          class="k-candle-chart-toolbar__menu-item"
          :aria-checked="option.value === drawing"
          data-testid="drawing-button"
          @click="pickDrawing(option.value)"
        >
          <AppIcon
            :name="DRAWING_ICONS[option.value]"
            stroke="fine"
          />
          {{ localize(option.label) }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.k-candle-chart-toolbar {
  display: flex;
  gap: spacing('3xs');
  align-items: center;
  min-width: 0;

  &__intervals {
    display: flex;
    gap: spacing('3xs');
  }

  // 手機上只留選著的那一顆——細邊寫不下五顆。
  &__interval {
    display: none;

    @include respond-to('md') {
      display: inline-flex;
    }

    &--active {
      display: inline-flex;
    }
  }

  &__separator {
    flex: none;
    background-color: color('chart-workspace-seam');
    width: 1px;
    height: font-size('xl');
  }

  &__drawing {
    position: relative;
  }

  &__menu {
    position: absolute;
    z-index: z-index('chrome');
    top: calc(100% + #{spacing('2xs')});
    left: 0;
    box-shadow: shadow('md');
    border-radius: radius('sm');
    background-color: color('chart-workspace-popover');
    padding: spacing('2xs') 0;
    min-width: 10rem;
  }

  &__menu-item {
    display: flex;
    gap: spacing('xs');
    align-items: center;
    border: 0;
    background: none;
    cursor: pointer;
    padding: spacing('2xs') spacing('sm');
    width: 100%;
    color: color('chart-workspace-text');
    font-size: font-size('sm');
    text-align: left;

    &:hover {
      background-color: color('chart-workspace-hover');
    }

    &[aria-checked='true'] {
      color: color('chart-workspace-accent');
    }
  }
}
</style>
