<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppIcon from '~/components/atoms/AppIcon.vue'
import type { ChartReadoutDto } from '~/domain/models/dto/chart-readout-dto'
import type { AppliedIndicatorRowDto } from '~/domain/models/dto/applied-indicator-row-dto'

/**
 * 分子：圖左上角的圖例，照 TradingView 的樣子。
 *
 * 第一行是「這張圖是什麼」——交易標的、彙總刻度、交易所，以及十字線所在那一根的開高低收與漲跌。
 * `#extra` 給合約補一行三條價格；每一個已套用的指標各佔一行，滑過去出現收起與移除。
 *
 * 它不判斷哪一根、漲跌多少、用什麼顏色——圖例那一行是領域算好的，這裡只把它排出來。
 */
const { title, intervalLabel, readout = null, appliedIndicatorRows = [] } = defineProps<{
  title: string
  intervalLabel: string
  readout?: ChartReadoutDto | null
  appliedIndicatorRows?: readonly AppliedIndicatorRowDto[]
}>()

const emit = defineEmits<{
  toggleVisibility: [appliedIndicatorId: number]
  remove: [appliedIndicatorId: number]
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()

const values = computed(() => {
  const current = readout
  if (current === null) {
    return []
  }

  const sign = current.change.isNegative() ? '−' : '+'
  const percent = current.changePercentText === null ? '' : ` (${sign}${current.changePercentText.replace('-', '')}%)`

  return [
    { label: t('marketData.chartWorkspace.open'), value: current.kCandle.open.toString() },
    { label: t('marketData.chartWorkspace.high'), value: current.kCandle.high.toString() },
    { label: t('marketData.chartWorkspace.low'), value: current.kCandle.low.toString() },
    { label: t('marketData.chartWorkspace.close'), value: current.kCandle.close.toString() },
    { label: '', value: `${sign}${current.change.abs().toString()}${percent}` },
  ]
})
</script>

<template>
  <div
    class="chart-legend"
    data-testid="chart-legend"
  >
    <div class="chart-legend__row chart-legend__row--main">
      <span class="chart-legend__title">
        {{ title }}
        <span class="chart-legend__dot">·</span>
        <span data-testid="interval-label">{{ intervalLabel }}</span>
      </span>
      <span
        v-if="readout"
        class="chart-legend__values"
        :class="`chart-legend__values--${readout.tone}`"
        :data-tone="readout.tone"
        data-testid="legend-values"
      >
        <span
          v-for="(item, index) in values"
          :key="index"
          class="chart-legend__value"
        >
          <span
            v-if="item.label"
            class="chart-legend__label"
          >{{ item.label }}</span>{{ item.value }}
        </span>
      </span>
    </div>

    <div
      v-if="$slots.extra"
      class="chart-legend__row"
    >
      <slot name="extra" />
    </div>

    <div
      v-for="row in appliedIndicatorRows"
      :key="row.appliedIndicator.id"
      class="chart-legend__row chart-legend__row--indicator"
      :class="{ 'chart-legend__row--off': !row.isVisible }"
      data-testid="legend-indicator"
    >
      <span class="chart-legend__title">{{ row.appliedIndicator.strategyScript.name }}</span>
      <span class="chart-legend__label">{{ localize(row.appliedIndicator.parameterSummary) }}</span>
      <span
        v-for="line in row.lines"
        :key="line.lineKey"
        class="chart-legend__swatch"
        :style="{ backgroundColor: `var(${line.colorToken})` }"
      />
      <span class="chart-legend__actions">
        <button
          type="button"
          class="chart-legend__action"
          :aria-label="row.isVisible ? t('marketData.chartWorkspace.hideIndicator') : t('marketData.chartWorkspace.showIndicator')"
          :title="row.isVisible ? t('marketData.chartWorkspace.hideIndicator') : t('marketData.chartWorkspace.showIndicator')"
          :data-testid="`legend-toggle-indicator-${row.appliedIndicator.id}`"
          @click="emit('toggleVisibility', row.appliedIndicator.id)"
        >
          <AppIcon
            :name="row.isVisible ? 'shown' : 'hidden'"
            size="small"
            stroke="fine"
          />
        </button>
        <button
          type="button"
          class="chart-legend__action"
          :aria-label="t('marketData.chartWorkspace.removeIndicator')"
          :title="t('marketData.chartWorkspace.removeIndicator')"
          :data-testid="`legend-remove-indicator-${row.appliedIndicator.id}`"
          @click="emit('remove', row.appliedIndicator.id)"
        >
          <AppIcon
            name="close"
            size="small"
            stroke="fine"
          />
        </button>
      </span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.chart-legend {
  display: flex;
  flex-direction: column;
  gap: 1px;
  align-items: flex-start;
  color: color('chart-workspace-text');
  font-size: font-size('sm');
  pointer-events: none;

  &__row {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('2xs');
    align-items: center;
    border-radius: radius('xs');
    padding: 1px spacing('2xs');
    max-width: 100%;
    pointer-events: auto;
    font-variant-numeric: tabular-nums;

    &:hover {
      background-color: color('chart-workspace-hover');
    }

    &--main {
      font-size: font-size('md');
    }

    &--off {
      opacity: 0.45;
    }
  }

  &__title {
    white-space: nowrap;
  }

  &__dot {
    color: color('chart-workspace-text-muted');
  }

  &__values {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
    font-size: font-size('sm');

    &--success {
      color: color('chart-workspace-up');
    }

    &--danger {
      color: color('chart-workspace-down');
    }

    &--neutral {
      color: color('chart-workspace-text-muted');
    }
  }

  &__value {
    white-space: nowrap;
  }

  &__label {
    margin-right: spacing('3xs');
    color: color('chart-workspace-text-muted');
  }

  &__swatch {
    border-radius: radius('xs');
    width: spacing('xs');
    height: 2px;
  }

  &__actions {
    display: none;
    gap: spacing('3xs');
  }

  &__row:hover &__actions,
  &__row:focus-within &__actions {
    display: inline-flex;
  }

  &__action {
    display: grid;
    place-items: center;
    border: 0;
    border-radius: radius('xs');
    background: none;
    cursor: pointer;
    padding: spacing('3xs');
    color: inherit;

    &:hover {
      background-color: color('chart-workspace-seam');
    }
  }
}
</style>
