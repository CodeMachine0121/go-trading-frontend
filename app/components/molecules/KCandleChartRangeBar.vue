<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '~/components/atoms/AppButton.vue'
import type { KCandleChartRangePresetDto } from '~/domain/models/dto/k-candle-chart-range-preset-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import type { PriceScaleMode } from '~/domain/models/vo/price-scale-mode-vo'

/**
 * 分子：看盤工作區的下方細邊，照 TradingView 的樣子。
 *
 * 左邊是快捷區間（按下的那一個亮起來，自己拖動之後就不亮——那件事由上一層決定）；
 * 右邊是現在幾點與顯示時區的位移、已取回區間的註腳，以及價格軸的三個開關。
 */
const {
  presets,
  activePreset = null,
  loading = false,
  now,
  timeZone,
  coveredRangeCaption = null,
  priceScaleMode,
  autoScale,
} = defineProps<{
  presets: readonly KCandleChartRangePresetDto[]
  activePreset?: KCandleChartRangePresetDto | null
  loading?: boolean
  now: Date
  timeZone: TimeZoneDto
  /** 手上這批涵蓋到哪；寬螢幕才看得到，沒有圖時不給。 */
  coveredRangeCaption?: string | null
  priceScaleMode: PriceScaleMode
  autoScale: boolean
}>()

const emit = defineEmits<{
  'selectPreset': [preset: KCandleChartRangePresetDto]
  'update:priceScaleMode': [mode: PriceScaleMode]
  'update:autoScale': [autoScale: boolean]
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()

/** 幾個長度彼此不重複，所以長度本身就認得出是哪一個——說法會跟著顯示語言換，認不得。 */
function isActivePreset(preset: KCandleChartRangePresetDto): boolean {
  return preset.spanMilliseconds === activePreset?.spanMilliseconds
}

/** 選定時區的當地時鐘：時、分、秒。 */
const clock = computed(() => timeZone.toWallClock(now).toISOString().slice(11, 19))

/** % 與對數互斥：按下亮著的那一顆回到一般刻度。 */
function toggleMode(mode: Exclude<PriceScaleMode, 'normal'>) {
  emit('update:priceScaleMode', priceScaleMode === mode ? 'normal' : mode)
}
</script>

<template>
  <div
    class="k-candle-chart-range-bar"
    data-testid="k-candle-chart-range-bar"
  >
    <div
      class="k-candle-chart-range-bar__presets"
      role="group"
      :aria-label="t('marketData.kCandleChartToolbar.rangeGroupLabel')"
    >
      <AppButton
        v-for="preset in presets"
        :key="preset.spanMilliseconds"
        variant="chrome"
        size="small"
        :aria-pressed="isActivePreset(preset)"
        :disabled="loading"
        data-testid="range-preset-button"
        @click="emit('selectPreset', preset)"
      >
        {{ localize(preset.label) }}
      </AppButton>
    </div>

    <span
      v-if="coveredRangeCaption"
      class="k-candle-chart-range-bar__covered"
      data-testid="covered-range"
    >{{ coveredRangeCaption }}</span>

    <span
      class="k-candle-chart-range-bar__clock"
      data-testid="workspace-clock"
    >{{ clock }} ({{ timeZone.offsetLabel }})</span>

    <span class="k-candle-chart-range-bar__separator" />

    <AppButton
      variant="chrome"
      size="small"
      :label="t('marketData.chartWorkspace.percentageScale')"
      :aria-pressed="priceScaleMode === 'percentage'"
      data-testid="percentage-scale"
      @click="toggleMode('percentage')"
    >
      %
    </AppButton>
    <AppButton
      variant="chrome"
      size="small"
      :aria-pressed="priceScaleMode === 'logarithmic'"
      :title="t('marketData.chartWorkspace.logarithmicScaleHint')"
      data-testid="logarithmic-scale"
      @click="toggleMode('logarithmic')"
    >
      {{ t('marketData.chartWorkspace.logarithmicScale') }}
    </AppButton>
    <AppButton
      variant="chrome"
      size="small"
      :aria-pressed="autoScale"
      :title="t('marketData.chartWorkspace.autoScaleHint')"
      data-testid="auto-scale"
      @click="emit('update:autoScale', !autoScale)"
    >
      {{ t('marketData.chartWorkspace.autoScale') }}
    </AppButton>
  </div>
</template>

<style scoped lang="scss">
.k-candle-chart-range-bar {
  display: flex;
  gap: spacing('3xs');
  align-items: center;
  padding: 0 spacing('2xs');
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
  color: color('chart-workspace-text');
  white-space: nowrap;

  &__presets {
    display: flex;
    flex: 1 0 auto;
    gap: spacing('3xs');
  }

  // 註腳是最先讓位的那一個：寫不下時收成省略號，價格軸那三個開關永遠看得到。
  &__covered {
    display: none;
    flex: 0 1 auto;
    overflow: hidden;
    min-width: 0;
    text-overflow: ellipsis;
    color: color('chart-workspace-text-muted');
    font-size: font-size('2xs');

    @include respond-to('lg') {
      display: inline;
    }
  }

  &__clock {
    padding: 0 spacing('xs');
    font-size: font-size('xs');
    font-variant-numeric: tabular-nums;
  }

  &__separator {
    flex: none;
    background-color: color('chart-workspace-seam');
    width: 1px;
    height: font-size('lg');
  }
}
</style>
