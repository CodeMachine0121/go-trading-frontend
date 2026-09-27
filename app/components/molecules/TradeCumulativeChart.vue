<script setup lang="ts">
import type { IChartApi, ISeriesApi, Time, UTCTimestamp } from 'lightweight-charts'
import type { TradeChartPointDto } from '~/domain/models/dto/trade-chart-point-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import { formatDateTimeInTimeZone } from '~/utilities/time-zone-format'
import { useThemeChange } from '~/composables/use-theme-change'

const { points, timeZone } = defineProps<{
  points: readonly TradeChartPointDto[]
  timeZone: TimeZoneDto
}>()

const chartHost = ref<HTMLElement | null>(null)
const chartApi = shallowRef<IChartApi | null>(null)
const seriesApi = shallowRef<ISeriesApi<'Line'> | null>(null)

function readColor(tokenName: string): string {
  return chartHost.value === null ? '' : getComputedStyle(chartHost.value).getPropertyValue(tokenName).trim()
}

function drawPoints(): void {
  seriesApi.value?.setData(points.reduce<{ time: UTCTimestamp, value: number }[]>((drawn, point) => {
    const second = Math.floor(timeZone.toWallClock(point.time).getTime() / 1000)
    const previousSecond = drawn.at(-1)?.time ?? Number.NEGATIVE_INFINITY

    return [...drawn, { time: Math.max(second, previousSecond + 1) as UTCTimestamp, value: point.value }]
  }, []))
  chartApi.value?.timeScale().fitContent()
}

function paintWithCurrentTheme(): void {
  if (chartApi.value === null) {
    return
  }

  const gridColor = readColor('--color-chart-grid')
  chartApi.value.applyOptions({
    layout: { background: { color: readColor('--color-surface') }, textColor: readColor('--color-text-muted') },
    grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
  })
  seriesApi.value?.applyOptions({ color: readColor('--color-primary') })
  drawPoints()
}

onMounted(async () => {
  const { createChart, LineSeries } = await import('lightweight-charts')
  if (chartHost.value === null) {
    return
  }

  const createdChart = createChart(chartHost.value, {
    autoSize: true,
    layout: { fontSize: Number.parseFloat(getComputedStyle(chartHost.value).fontSize), attributionLogo: false },
    timeScale: { timeVisible: true, secondsVisible: false },
    localization: {
      timeFormatter: (time: Time) => formatDateTimeInTimeZone(new Date(Number(time) * 1000), 'UTC'),
    },
  })
  chartApi.value = createdChart
  seriesApi.value = createdChart.addSeries(LineSeries, { lineWidth: 2, priceLineVisible: false, lastValueVisible: true })
  paintWithCurrentTheme()
})

useThemeChange(paintWithCurrentTheme)

onBeforeUnmount(() => {
  chartApi.value?.remove()
  chartApi.value = null
  seriesApi.value = null
})

watch(() => [points, timeZone] as const, drawPoints)
</script>

<template>
  <div
    ref="chartHost"
    class="trade-cumulative-chart"
    data-testid="r-multiple-chart"
  />
</template>

<style scoped lang="scss">
.trade-cumulative-chart {
  height: 14rem;
}
</style>
