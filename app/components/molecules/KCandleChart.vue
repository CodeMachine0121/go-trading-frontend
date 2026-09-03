<script setup lang="ts">
import type { IChartApi, ISeriesApi, TickMarkType, Time, UTCTimestamp } from 'lightweight-charts'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import { formatDateTimeInTimeZone } from '~/utilities/time-zone-format'

/**
 * 刻度種類的那一組列舉值。它是執行期的東西，而繪圖函式庫要掛載後才載得進來
 * （它碰得到 document），所以型別在這裡先取出來，值等載完再拿。
 */
type TickMarkTypes = typeof import('lightweight-charts').TickMarkType

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

/** 繪圖函式庫收發的是秒，這裡收發的是時間值。 */
function timeValueOf(time: Time): Date {
  return new Date(Number(time) * 1000)
}

/**
 * 交給繪圖函式庫的**不是**瞬間，而是選定時區的**當地時鐘讀數**。
 *
 * 它決定哪一格該標年、哪一格該標日，看的是自己收到的時間的世界標準時間年月日
 * （`weightByTime`）。餵真正的瞬間進去，分格就會落在世界標準時間的午夜與元旦上——
 * 負位移的時區還會整格標成前一天、前一年。把讀數搬進去，分格與標籤就都是當地的。
 */
function wallClockSecondsOf(instant: Date, timeZone: TimeZoneDto): UTCTimestamp {
  return (timeZone.toWallClock(instant).getTime() / 1000) as UTCTimestamp
}

/**
 * 時間軸一格刻度要說到多細：年、月、日或時分。
 * 切的是當地時鐘讀數（`2026-08-30 12:00`），與分格用的是同一份讀數。
 */
function sliceTickMark(
  localDateTime: string, tickMarkType: TickMarkType, tickMarkTypes: TickMarkTypes): string {
  switch (tickMarkType) {
    case tickMarkTypes.Year:
      return localDateTime.slice(0, 4)
    case tickMarkTypes.Month:
      return localDateTime.slice(0, 7)
    case tickMarkTypes.DayOfMonth:
      return localDateTime.slice(5, 10)
    default:
      return localDateTime.slice(11, 16)
  }
}

const { chart = null, drawing = 'candlestick', visibleStartTime, visibleEndTime, timeZone } = defineProps<{
  chart?: KCandleChartDto | null
  drawing?: KCandleChartDrawing
  visibleStartTime: Date
  visibleEndTime: Date
  /** 時間軸與十字準星用哪一個時區說。 */
  timeZone: TimeZoneDto
}>()

const emit = defineEmits<{ rangeChange: [{ startTime: Date, endTime: Date }] }>()

const chartHost = ref<HTMLElement | null>(null)
const chartApi = shallowRef<IChartApi | null>(null)
const seriesApi = shallowRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(null)
const createSeriesFor = shallowRef<((drawing: KCandleChartDrawing) => void) | null>(null)
const applyTimeZoneFormatting = shallowRef<(() => void) | null>(null)
const releaseGestureListeners = shallowRef<(() => void) | null>(null)
let rangeSettleTimer: ReturnType<typeof setTimeout> | null = null
/**
 * 上一次區間變動是不是圖自己造成的。
 *
 * 繪圖函式庫對**任何**區間變動都會通知，包含 `setData` 與我們自己發出的
 * `setVisibleRange`。把那些當成使用者拖曳的後果是：剛按下的快捷區間會自己失去反白，
 * 而且回報的區間會被對齊到真實資料上——資料稀疏時，「看一年」會被對齊成「看一天」，
 * 於是又推導出五分鐘刻度、再取一次。
 */
let selfIssuedRangeChange = false

/**
 * 顏色一律從 token 展開出來的 CSS 變數讀，不在這裡寫死色碼——
 * 繪圖函式庫吃的是實際的顏色字串，而 token 是那些字串唯一的來源。
 */
function readColor(host: HTMLElement, tokenName: string): string {
  return getComputedStyle(host).getPropertyValue(tokenName).trim()
}

/** 精確小數只在真的要畫的這一刻才變成一般數值——繪圖函式庫只吃得下一般數值。 */
function drawKCandles() {
  const series = seriesApi.value
  const host = chartHost.value
  // 資料在繪圖函式庫載完之前就換了一批：還沒有東西可以畫，等載完那一刻自己會畫。
  if (series === null || host === null) {
    return
  }

  // 三種語氣的顏色一次讀完。它們在同一批 K 線之間不會變，
  // 而一次繪製最多八百根——放在迴圈裡就是對同一個元素做八百次樣式解析。
  const toneColors = {
    success: readColor(host, TONE_COLOR_TOKENS.success),
    danger: readColor(host, TONE_COLOR_TOKENS.danger),
    neutral: readColor(host, TONE_COLOR_TOKENS.neutral),
  }

  const kCandles = chart === null ? [] : chart.kCandles
  const rows = kCandles.map((kCandle) => {
    const time = wallClockSecondsOf(kCandle.openTime, timeZone)

    if (drawing === 'line') {
      return { time, value: kCandle.close.toNumber() }
    }

    const toneColor = toneColors[kCandle.trend.tone]

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
  applyVisibleRange()
}

/**
 * 把看的位置擺到外面指定的那一段。
 *
 * 這件事必須與「換一批資料」分開，因為它會單獨發生：使用者按下快捷區間、
 * 或拉遠到被收回上限時，資料可能完全不必換（手上那批就夠了），
 * 但位置一定要動。少了這一條，按鈕看起來就像壞掉。
 */
function applyVisibleRange() {
  // 圖自己換位置也會回頭說一次「正在看的區間變了」，那不是使用者的動作。
  // setData 與 setVisibleRange 發出的事件會被下面的等待時間併成同一次，
  // 所以標記一次就夠——真正的手勢會在事件之前先把這個標記清掉。
  selfIssuedRangeChange = true

  chartApi.value?.timeScale().setVisibleRange({
    from: wallClockSecondsOf(visibleStartTime, timeZone),
    to: wallClockSecondsOf(visibleEndTime, timeZone),
  })
}

onMounted(async () => {
  const { createChart, CandlestickSeries, LineSeries, TickMarkType } = await import('lightweight-charts')

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
      // 圖上不擺繪圖函式庫的商標。它的授權要求的是保留 NOTICE 與一個連結，
      // 而這個操作台只在本機跑、沒有對外的頁面可以放那個連結；
      // 函式庫本身也為此留了這個開關（預設為開）。
      attributionLogo: false,
    },
    grid: {
      vertLines: { color: borderColor },
      horzLines: { color: borderColor },
    },
    rightPriceScale: { borderColor },
    timeScale: { borderColor, timeVisible: true, secondsVisible: false },
  })

  chartApi.value = createdChart

  // 時間的說法與其他選項分開套用：它會跟著使用者換時區再套一次，
  // 而 applyOptions 是合併的，因此這裡只講時間怎麼寫，不必重覆其他設定。
  // 送進去的既然是當地時鐘讀數，標籤就照世界標準時間讀出來——那正是當地的說法。
  const readWallClock = (time: Time) => formatDateTimeInTimeZone(timeValueOf(time), 'UTC')
  applyTimeZoneFormatting.value = () => createdChart.applyOptions({
    localization: { timeFormatter: (time: Time) => readWallClock(time) },
    timeScale: {
      tickMarkFormatter: (time: Time, tickMarkType: TickMarkType) => sliceTickMark(
        readWallClock(time), tickMarkType, TickMarkType),
    },
  })
  applyTimeZoneFormatting.value()

  createSeriesFor.value = (nextDrawing: KCandleChartDrawing) => {
    if (seriesApi.value !== null) {
      createdChart.removeSeries(seriesApi.value)
    }

    seriesApi.value = nextDrawing === 'line'
      ? createdChart.addSeries(LineSeries, { color: readColor(host, '--color-primary'), lineWidth: 2 })
      : createdChart.addSeries(CandlestickSeries)
  }

  // 真正的手勢一定發生在它造成的區間事件之前，所以在這裡清掉標記，
  // 就不會有「上一次繪製沒有觸發事件、標記卡著」而吃掉使用者下一次拖曳的情況。
  const markUserGesture = () => {
    selfIssuedRangeChange = false
  }
  host.addEventListener('wheel', markUserGesture, { passive: true })
  host.addEventListener('pointerdown', markUserGesture)
  host.addEventListener('touchstart', markUserGesture, { passive: true })
  releaseGestureListeners.value = () => {
    host.removeEventListener('wheel', markUserGesture)
    host.removeEventListener('pointerdown', markUserGesture)
    host.removeEventListener('touchstart', markUserGesture)
  }

  // 先接上通知再畫第一次，這樣連第一次繪製自己造成的區間變動也走得到抑制邏輯。
  createdChart.timeScale().subscribeVisibleTimeRangeChange((range: { from: Time, to: Time } | null) => {
    if (range === null) {
      return
    }

    if (rangeSettleTimer !== null) {
      clearTimeout(rangeSettleTimer)
    }

    rangeSettleTimer = setTimeout(() => {
      if (selfIssuedRangeChange) {
        selfIssuedRangeChange = false
        return
      }

      // 圖上那一段是當地時鐘讀數，外面要的是瞬間。
      emit('rangeChange', {
        startTime: timeZone.fromWallClock(timeValueOf(range.from)),
        endTime: timeZone.fromWallClock(timeValueOf(range.to)),
      })
    }, RANGE_SETTLE_MILLISECONDS)
  })

  createSeriesFor.value(drawing)
  drawKCandles()
})

watch(() => chart, drawKCandles)

// 外面換了要看的那一段（按快捷區間、被收回上限）而資料不必換時，只需要移動位置。
watch([() => visibleStartTime, () => visibleEndTime], applyVisibleRange)

// 換時區只是換一種說法：看的還是同一段、同一批資料，但交給繪圖函式庫的讀數整批換了一種寫法，
// 所以連資料帶位置一起重講一次——不會因此回頭去取任何東西。
watch(() => timeZone, () => {
  applyTimeZoneFormatting.value?.()
  drawKCandles()
})

// 換畫法只是換一種畫，看的還是同一段、同一批資料，所以不重新取，只重畫。
watch(() => drawing, (nextDrawing) => {
  createSeriesFor.value?.(nextDrawing)
  drawKCandles()
})

onBeforeUnmount(() => {
  if (rangeSettleTimer !== null) {
    clearTimeout(rangeSettleTimer)
  }

  releaseGestureListeners.value?.()
  releaseGestureListeners.value = null
  applyTimeZoneFormatting.value = null

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
  // 圖用光面板給它的所有高度。看得多寬與看得多高都是使用者的事，
  // 寫死一個 32rem 只會在大螢幕上留一大片沒人要的空白。
  flex: 1;
  background-color: color('surface');
  width: 100%;
  min-height: 20rem;
}
</style>
