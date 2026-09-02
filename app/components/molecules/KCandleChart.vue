<script setup lang="ts">
import type { IChartApi, ISeriesApi, Time, UTCTimestamp } from 'lightweight-charts'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'

/** 同一批資料的兩種畫法。是同一個元件的兩個樣子，不是兩個元件。 */
type KCandleChartDrawing = 'candlestick' | 'line'

/**
 * 分子：把一批 K 線畫出來，並把使用者拉出來的新區間送回去。
 *
 * 這是全站唯一認識繪圖函式庫的檔案。它碰得到 document（伺服器端沒有），
 * 所以在掛載後才動態載入，比照 AppCodeEditor。
 *
 * 它不判斷任何事：每根多粗、要不要重新取、取哪一段，全部在領域算好了；
 * 這裡只負責畫，以及告訴外面「使用者現在在看這一段」。
 */

/** 漲跌語氣對應到哪一個顏色 token。語氣是領域算好的，這裡只負責接到顏色上。 */
const TONE_COLOR_TOKENS: Record<'success' | 'danger' | 'neutral', string> = {
  success: '--color-success',
  danger: '--color-danger',
  neutral: '--color-text-muted',
}

/**
 * 使用者拉遠拉近時，區間會連續變動好幾十次。等他停下來再說一次就好——
 * 否則每一格縮放都會問一次「要不要重新取」。
 */
const RANGE_SETTLE_MILLISECONDS = 220

const { chart = null, drawing = 'candlestick', visibleStartTime, visibleEndTime } = defineProps<{
  chart?: KCandleChartDto | null
  drawing?: KCandleChartDrawing
  visibleStartTime: Date
  visibleEndTime: Date
}>()

const emit = defineEmits<{ rangeChange: [{ startTime: Date, endTime: Date }] }>()

const chartHost = ref<HTMLElement | null>(null)
const chartApi = shallowRef<IChartApi | null>(null)
const seriesApi = shallowRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(null)
const createSeriesFor = shallowRef<((drawing: KCandleChartDrawing) => void) | null>(null)
let rangeSettleTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 顏色一律從 token 展開出來的 CSS 變數讀，不在這裡寫死色碼——
 * 繪圖函式庫吃的是實際的顏色字串，而 token 是那些字串唯一的來源。
 */
function readColor(tokenName: string): string {
  if (chartHost.value === null) {
    return ''
  }

  return getComputedStyle(chartHost.value).getPropertyValue(tokenName).trim()
}

/** 精確小數只在真的要畫的這一刻才變成一般數值——繪圖函式庫只吃得下一般數值。 */
function drawKCandles() {
  const series = seriesApi.value
  if (series === null) {
    return
  }

  const kCandles = chart === null ? [] : chart.kCandles
  const rows = kCandles.map((kCandle) => {
    const time = (kCandle.openTime.getTime() / 1000) as UTCTimestamp

    if (drawing === 'line') {
      return { time, value: kCandle.close.toNumber() }
    }

    const toneColor = readColor(TONE_COLOR_TOKENS[kCandle.trend.tone])

    return {
      time,
      open: kCandle.open.toNumber(),
      high: kCandle.high.toNumber(),
      low: kCandle.low.toNumber(),
      close: kCandle.close.toNumber(),
      color: toneColor,
      borderColor: toneColor,
      wickColor: toneColor,
    }
  })

  series.setData(rows)

  // 換上新的一批之後，把看的位置擺回使用者原本在看的那一段——
  // 否則畫面會自己跳到別的地方，看起來像圖被抽換掉了。
  chartApi.value?.timeScale().setVisibleRange({
    from: (visibleStartTime.getTime() / 1000) as UTCTimestamp,
    to: (visibleEndTime.getTime() / 1000) as UTCTimestamp,
  })
}

onMounted(async () => {
  const { createChart, CandlestickSeries, LineSeries } = await import('lightweight-charts')

  if (chartHost.value === null) {
    return
  }

  const borderColor = readColor('--color-border')
  const createdChart = createChart(chartHost.value, {
    autoSize: true,
    layout: {
      background: { color: readColor('--color-surface') },
      textColor: readColor('--color-text-muted'),
    },
    grid: {
      vertLines: { color: borderColor },
      horzLines: { color: borderColor },
    },
    rightPriceScale: { borderColor },
    timeScale: { borderColor, timeVisible: true, secondsVisible: false },
  })

  chartApi.value = createdChart
  createSeriesFor.value = (nextDrawing: KCandleChartDrawing) => {
    if (seriesApi.value !== null) {
      createdChart.removeSeries(seriesApi.value)
    }

    seriesApi.value = nextDrawing === 'line'
      ? createdChart.addSeries(LineSeries, { color: readColor('--color-primary'), lineWidth: 2 })
      : createdChart.addSeries(CandlestickSeries)
  }

  createSeriesFor.value(drawing)
  drawKCandles()

  createdChart.timeScale().subscribeVisibleTimeRangeChange((range: { from: Time, to: Time } | null) => {
    if (range === null) {
      return
    }

    if (rangeSettleTimer !== null) {
      clearTimeout(rangeSettleTimer)
    }

    rangeSettleTimer = setTimeout(() => emit('rangeChange', {
      startTime: new Date(Number(range.from) * 1000),
      endTime: new Date(Number(range.to) * 1000),
    }), RANGE_SETTLE_MILLISECONDS)
  })
})

watch(() => chart, drawKCandles)

// 換畫法只是換一種畫，看的還是同一段、同一批資料，所以不重新取，只重畫。
watch(() => drawing, (nextDrawing) => {
  createSeriesFor.value?.(nextDrawing)
  drawKCandles()
})

onBeforeUnmount(() => {
  if (rangeSettleTimer !== null) {
    clearTimeout(rangeSettleTimer)
  }

  chartApi.value?.remove()
  chartApi.value = null
  seriesApi.value = null
})
</script>

<template>
  <div
    ref="chartHost"
    class="k-candle-chart"
    data-testid="k-candle-chart"
  />
</template>

<style scoped lang="scss">
.k-candle-chart {
  border: 1px solid color('border');
  border-radius: radius('md');
  background-color: color('surface');
  width: 100%;
  height: 32rem;

  @include respond-to('md') {
    height: 40rem;
  }
}
</style>
