<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { IChartApi, IPriceLine, ISeriesApi, ISeriesMarkersPluginApi, TickMarkType as TickMarkTypeValue, Time, UTCTimestamp } from 'lightweight-charts'
import type { TradePricePathDto } from '~/domain/models/dto/trade-price-path-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import { formatDateTimeInTimeZone } from '~/utilities/time-zone-format'
import { formatWallClockTickMark } from '~/utilities/chart-tick-mark-format'
import { useThemeChange } from '~/composables/use-theme-change'

const LINE_TONE_TOKENS = {
  success: '--color-success',
  danger: '--color-danger',
  neutral: '--color-text-muted',
  muted: '--color-text-faint',
} as const

const { pricePath, timeZone } = defineProps<{
  pricePath: TradePricePathDto
  timeZone: TimeZoneDto
}>()

const { locale } = useI18n()
const { localize } = useLocalizedText()

const chartHost = ref<HTMLElement | null>(null)
const chartApi = shallowRef<IChartApi | null>(null)
const seriesApi = shallowRef<ISeriesApi<'Candlestick'> | null>(null)
const markersApi = shallowRef<ISeriesMarkersPluginApi<Time> | null>(null)
const priceLines = shallowRef<IPriceLine[]>([])

function wallClockSecondsOf(instant: Date): UTCTimestamp {
  return (timeZone.toWallClock(instant).getTime() / 1000) as UTCTimestamp
}

function readColor(tokenName: string): string {
  return chartHost.value === null ? '' : getComputedStyle(chartHost.value).getPropertyValue(tokenName).trim()
}

function drawPriceLinesAndMarkers(): void {
  const series = seriesApi.value
  if (series === null) {
    return
  }

  for (const priceLine of priceLines.value) {
    series.removePriceLine(priceLine)
  }
  priceLines.value = pricePath.lines.map(line => series.createPriceLine({
    price: line.price.toNumber(),
    color: readColor(LINE_TONE_TOKENS[line.tone]),
    lineWidth: 1,
    lineStyle: 2,
    title: localize(line.label),
  }))

  markersApi.value?.setMarkers(pricePath.markers.map(marker => ({
    time: wallClockSecondsOf(marker.time),
    position: marker.kind === 'entry' ? 'belowBar' : 'aboveBar',
    shape: marker.kind === 'entry' ? 'arrowUp' : 'arrowDown',
    color: readColor(marker.kind === 'entry' ? '--color-success' : '--color-primary'),
    text: localize(marker.text),
  })))
}

/** 換一份資料時才重畫 K 線、重新對齊整段；線與標記另外畫，換語言、換主題都不必動到這一步。 */
function drawCandles(): void {
  seriesApi.value?.setData(pricePath.candles.map(candle => ({
    time: wallClockSecondsOf(candle.openTime),
    open: candle.open.toNumber(),
    high: candle.high.toNumber(),
    low: candle.low.toNumber(),
    close: candle.close.toNumber(),
  })))
  chartApi.value?.timeScale().fitContent()
}

function drawPricePath(): void {
  drawCandles()
  drawPriceLinesAndMarkers()
}

function paintWithCurrentTheme(): void {
  if (chartApi.value === null) {
    return
  }

  const gridColor = readColor('--color-chart-grid')
  const borderColor = readColor('--color-border')
  chartApi.value.applyOptions({
    layout: { background: { color: readColor('--color-surface') }, textColor: readColor('--color-text-muted') },
    grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
    rightPriceScale: { borderColor },
    timeScale: { borderColor },
  })
  seriesApi.value?.applyOptions({
    upColor: readColor('--color-success'),
    downColor: readColor('--color-danger'),
    wickUpColor: readColor('--color-success'),
    wickDownColor: readColor('--color-danger'),
    borderVisible: false,
  })
  // 換主題只換顏色，使用者縮放到哪裡就留在哪裡。
  drawPriceLinesAndMarkers()
}

onMounted(async () => {
  const { createChart, CandlestickSeries, createSeriesMarkers, TickMarkType } = await import('lightweight-charts')
  if (chartHost.value === null) {
    return
  }

  const createdChart = createChart(chartHost.value, {
    autoSize: true,
    layout: { fontSize: Number.parseFloat(getComputedStyle(chartHost.value).fontSize), attributionLogo: false },
    timeScale: {
      timeVisible: true,
      secondsVisible: false,
      tickMarkFormatter: (time: Time, tickMarkType: TickMarkTypeValue) => formatWallClockTickMark(
        time, tickMarkType, TickMarkType),
    },
    localization: {
      timeFormatter: (time: Time) => formatDateTimeInTimeZone(new Date(Number(time) * 1000), 'UTC'),
    },
  })
  chartApi.value = createdChart
  seriesApi.value = createdChart.addSeries(CandlestickSeries, { priceLineVisible: false, lastValueVisible: false })
  markersApi.value = createSeriesMarkers(seriesApi.value, [])
  drawCandles()
  paintWithCurrentTheme()
})

useThemeChange(paintWithCurrentTheme)

onBeforeUnmount(() => {
  chartApi.value?.remove()
  chartApi.value = null
  seriesApi.value = null
  markersApi.value = null
})

watch(() => [pricePath, timeZone] as const, drawPricePath)
// 換語言只換線上與標記上的字，不重畫整段——重畫會把使用者拉好的縮放還原。
watch(locale, drawPriceLinesAndMarkers)
</script>

<template>
  <div class="trade-price-path-chart">
    <div
      ref="chartHost"
      class="trade-price-path-chart__canvas"
      data-testid="price-path-chart"
    />
    <ul
      v-if="pricePath.lines.length > 0"
      class="trade-price-path-chart__legend"
      data-testid="price-path-legend"
    >
      <li
        v-for="line in pricePath.lines"
        :key="line.kind"
        class="trade-price-path-chart__legend-item"
        :class="`trade-price-path-chart__legend-item--${line.tone}`"
      >
        — {{ localize(line.label) }} {{ line.priceText }}
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.trade-price-path-chart {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');

  &__canvas {
    height: 18rem;
  }

  &__legend {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('2xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__legend-item {
    border-radius: radius('xs');
    background-color: color('surface-muted');
    padding: 0 spacing('2xs');
    font-size: font-size('2xs');
    line-height: line-height('normal');

    @include numeric;

    &--success {
      color: color('success');
    }

    &--danger {
      color: color('danger');
    }

    &--neutral {
      color: color('text');
    }

    &--muted {
      color: color('text-muted');
    }
  }
}
</style>
