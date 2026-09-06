<script setup lang="ts">
import type { IChartApi, ISeriesApi, Time, UTCTimestamp } from 'lightweight-charts'
import type { EquityPointDto } from '~/domain/models/dto/equity-point-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import { formatDateTimeInTimeZone } from '~/utilities/time-zone-format'

/**
 * 分子：把一次回測的資金曲線畫成一條線。
 *
 * 它與 K 線圖用的是同一個繪圖函式庫，但不是同一個元件：那一個要畫蠟燭、要跟盤、
 * 要把使用者拉出來的區間送回去，而這一條線一件都不做。共用的是**函式庫**，不是那個元件。
 *
 * 它碰得到 document（伺服器端沒有），所以在掛載後才動態載入，比照 K 線圖。
 */

/**
 * 交給繪圖函式庫的**不是**瞬間，而是選定時區的**當地時鐘讀數**。
 * 理由與 K 線圖完全相同：分格與標籤都要是當地的說法，而它是看自己收到的時間切的。
 */
function wallClockSecondsOf(instant: Date, timeZone: TimeZoneDto): UTCTimestamp {
  return (timeZone.toWallClock(instant).getTime() / 1000) as UTCTimestamp
}

function readColor(host: HTMLElement, tokenName: string): string {
  return getComputedStyle(host).getPropertyValue(tokenName).trim()
}

function readFontSize(host: HTMLElement): number {
  return Number.parseFloat(getComputedStyle(host).fontSize)
}

const { equityCurve, timeZone } = defineProps<{
  equityCurve: readonly EquityPointDto[]
  timeZone: TimeZoneDto
}>()

const chartHost = ref<HTMLElement | null>(null)
const chartApi = ref<IChartApi | null>(null)
const seriesApi = ref<ISeriesApi<'Line'> | null>(null)

/** 精確小數只在真的要畫的這一刻才變成一般數值——繪圖函式庫只吃得下一般數值。 */
function drawEquityCurve() {
  const series = seriesApi.value
  if (series === null) {
    return
  }

  series.setData(equityCurve.map(equityPoint => ({
    time: wallClockSecondsOf(equityPoint.openTime, timeZone),
    value: equityPoint.equity.toNumber(),
  })))
  chartApi.value?.timeScale().fitContent()
}

onMounted(async () => {
  const { createChart, LineSeries } = await import('lightweight-charts')

  // 函式庫還沒載完，使用者就離開了這個畫面：沒有容器可以畫，就不要建立圖表。
  if (chartHost.value === null) {
    return
  }

  const host = chartHost.value
  const borderColor = readColor(host, '--color-border')
  const createdChart = createChart(host, {
    autoSize: true,
    layout: {
      background: { color: readColor(host, '--color-surface') },
      textColor: readColor(host, '--color-text-muted'),
      fontSize: readFontSize(host),
      // 圖上不擺繪圖函式庫的商標，理由與 K 線圖相同（見那裡的說明）。
      attributionLogo: false,
    },
    grid: {
      vertLines: { color: borderColor },
      horzLines: { color: borderColor },
    },
    rightPriceScale: { borderColor },
    timeScale: { borderColor, timeVisible: true, secondsVisible: false },
  })

  // 送進去的既然是當地時鐘讀數，標籤就照世界標準時間讀出來——那正是當地的說法。
  createdChart.applyOptions({
    localization: {
      timeFormatter: (time: Time) => formatDateTimeInTimeZone(
        new Date(Number(time) * 1000), 'UTC'),
    },
  })

  chartApi.value = createdChart
  seriesApi.value = createdChart.addSeries(LineSeries, {
    color: readColor(host, '--color-primary'),
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: false,
  })

  drawEquityCurve()
})

onBeforeUnmount(() => {
  chartApi.value?.remove()
  chartApi.value = null
  seriesApi.value = null
})

// 換了一次回測、或換了顯示時區，就重畫。時區也要重畫，因為餵進去的是當地讀數。
watch(() => [equityCurve, timeZone] as const, drawEquityCurve)
</script>

<template>
  <div
    ref="chartHost"
    class="backtest-equity-curve-chart"
    data-testid="equity-curve-chart"
  />
</template>

<style scoped lang="scss">
.backtest-equity-curve-chart {
  // 一條線不必像 K 線圖那麼高：它要說的是形狀，不是每一根的細節。
  height: 16rem;
}
</style>
