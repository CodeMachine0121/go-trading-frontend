<script setup lang="ts">
import KCandleChart from '~/components/molecules/KCandleChart.vue'
import KCandleChartToolbar from '~/components/molecules/KCandleChartToolbar.vue'
import ChartIndicatorPanel from '~/components/molecules/ChartIndicatorPanel.vue'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import type { ChartIndicatorApplication } from '~/application/chart-indicator-application'
import type { KCandleChartApplication } from '~/application/k-candle-chart-application'
import type { LiveKCandleApplication } from '~/application/live-k-candle-application'
import type { StrategyApplication } from '~/application/strategy-application'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'
import type { KCandleChartRangePresetDto } from '~/domain/models/dto/k-candle-chart-range-preset-dto'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { ChartVisibleRangeVo } from '~/domain/models/vo/chart-visible-range-vo'
import { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import type { StrategyDto } from '~/domain/models/dto/strategy-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

/** 進入畫面時預先帶入的交易標的，只是省一次輸入，使用者可自行更換。 */
const DEFAULT_SYMBOL = 'BTCUSDT'

// 有機體：K 線圖表這一整塊。Application 由頁面注入——頁面只做接線，互動邏輯住在這裡。
// 這裡不做任何業務判斷：每根多粗、要不要重新取、取哪一段，全部問 Application。
const {
  kCandleChartApplication,
  tradingSymbolApplication,
  chartIndicatorApplication,
  liveKCandleApplication,
  strategyApplication,
  timeZone,
} = defineProps<{
  kCandleChartApplication: KCandleChartApplication
  tradingSymbolApplication: TradingSymbolApplication
  chartIndicatorApplication: ChartIndicatorApplication
  liveKCandleApplication: LiveKCandleApplication
  strategyApplication: StrategyApplication
  /** 時間軸與已取回區間用哪一個時區說。 */
  timeZone: TimeZoneDto
}>()

const symbol = ref(DEFAULT_SYMBOL)
const drawing = ref<'candlestick' | 'line'>('candlestick')

const presets = ref<KCandleChartRangePresetDto[]>([])
const activePresetLabel = ref<string | null>(null)

const chart = ref<KCandleChartDto | null>(null)
const visibleStartTime = ref(new Date())
const visibleEndTime = ref(new Date())

const loading = ref(false)
const symbolError = ref<string | null>(null)
const rejectedMessage = ref<string | null>(null)
const serverErrorMessage = ref<string | null>(null)
const backendUnreachable = ref(false)

/**
 * 使用者拉一下、還沒回來又拉一下時，先送出的那次可能後回來。
 * 只採用最後一次的結果，否則畫面會被舊資料蓋回去。
 */
let latestRequestNumber = 0

// 圖上的指標。狀態住在 composable，這裡只負責在對的時機告訴它「圖上那批換了」。
const chartIndicators = useChartIndicators(chartIndicatorApplication)

/** 可以挑來套用的策略。取不到清單時是空的——那是一份清單，不是一個功能。 */
const strategies = ref<StrategyDto[]>([])

const intervalLabel = computed(() => chart.value === null ? '—' : chart.value.interval.label)

/** 即時更新停掉了。圖照常顯示，只是不再跟著市場動——所以要明說。 */
const liveUpdateStalled = ref(false)
/** 怎麼停止跟目前這一檔。換一批 K 線、離開畫面時都要用到。 */
let stopFollowing: (() => void) | null = null
/**
 * 這是第幾次跟盤。回呼是個閉包，它可能比自己的訂閱活得更久——
 * 只認自己那一次的號碼，就不必假設「停止」在每一種情況下都立刻生效。
 * 圖表與指標各自也有同一套，理由一模一樣。
 */
let followGeneration = 0

async function showViewport(kCandleChartViewportDto: KCandleChartViewportDto) {
  // 正在看的那一段等領域回答再設：它可能與這裡問的不一樣（拉太遠會被收回上限），
  // 先樂觀寫上去的話，被收回的那一次畫面會停在使用者其實看不完的寬度上。
  latestRequestNumber += 1
  const requestNumber = latestRequestNumber

  loading.value = true
  symbolError.value = null
  rejectedMessage.value = null
  serverErrorMessage.value = null
  backendUnreachable.value = false

  try {
    const chartView = await kCandleChartApplication.loadKCandleChart(kCandleChartViewportDto)

    if (requestNumber === latestRequestNumber) {
      // 一律照領域說的那一段擺位置：它可能與剛才問的不一樣（拉太遠會被收回上限）。
      visibleStartTime.value = chartView.visibleStartTime
      visibleEndTime.value = chartView.visibleEndTime

      // null 代表手上那批就夠了——不換資料，尤其不能把圖清掉。
      if (chartView.reloadedChart !== null) {
        chart.value = chartView.reloadedChart
      }

      // **指標算的是使用者正在看的那一段**，不是手上那一整批（後者兩側各多取了半段）。
      // 因此重算掛在顯示區間上，而不是掛在「有沒有重新取資料」上：
      // 拉遠拉近改變的是他看得見的那一段，一支「這段區間的最高價」本來就該跟著變。
      // 「不重算」的條件因此收窄成「那一段真的沒變」，由顯示區間自己回答。
      if (chart.value !== null) {
        chartIndicators.recalculateForRange(
          chart.value,
          new ChartVisibleRangeVo(chartView.visibleStartTime, chartView.visibleEndTime))
      }

      // 跟盤放在記下顯示區間**之後**：跟盤一開始，更新隨時可能進來，
      // 而處理一則更新的第一件事就是問「這一段看得到最新那一根嗎」。
      if (chartView.reloadedChart !== null) {
        followTheMarket(chartView.reloadedChart)
      }
    }
  }
  catch (error: unknown) {
    if (requestNumber !== latestRequestNumber) {
      return
    }

    // 哨兵錯誤分流：使用者可自行修正的標在欄位旁，其餘整塊呈現。
    if (error instanceof KCandleQueryValidationError) {
      symbolError.value = error.message
    }
    else if (error instanceof BackendServerError) {
      serverErrorMessage.value = error.message
    }
    else if (error instanceof BackendRequestRejectedError) {
      rejectedMessage.value = error.message
    }
    else if (error instanceof BackendUnreachableError) {
      backendUnreachable.value = true
    }
    else {
      rejectedMessage.value = '取行情時發生未預期的錯誤。'
    }

    chart.value = null
    // 圖沒了，跟盤也得停。留著它，上一檔的下一則更新就會把圖「復活」——
    // 而畫面上同時還顯示著取行情失敗，看到的人會以為那張圖是這一檔的。
    stopFollowing?.()
    stopFollowing = null
    followGeneration += 1
    liveUpdateStalled.value = false
    // 上一批算出來的線也不能留——它們畫的是另一段行情，
    // 而且會在一張空圖上繼續撐著價格軸。已套用的清單留著，等圖回來自己會重算。
    chartIndicators.clearLines()
  }
  finally {
    if (requestNumber === latestRequestNumber) {
      loading.value = false
    }
  }
}

/**
 * 開始跟這一檔的市場。換一批 K 線就換一次：跟盤是把即時的變動併進**手上這一批**，
 * 舊的那一批已經不在圖上了。
 */
function followTheMarket(followedChart: KCandleChartDto) {
  stopFollowing?.()
  followGeneration += 1
  const generation = followGeneration

  stopFollowing = liveKCandleApplication.followKCandles(
    followedChart.symbol, followedChart, (report) => {
      // 已經不是這一次在跟了：這一則講的是上一檔的行情。
      if (generation !== followGeneration) {
        return
      }

      // 跟不動了：明說，但圖照樣顯示手上有的——停的是「即時」，不是「圖表」。
      liveUpdateStalled.value = report.isStalled
      if (report.isStalled) {
        return
      }

      chart.value = report.chart

      // 還在走的那一根怎麼動都不改變指標的答案（它本來就不算數），重算只是白算。
      // 一根**走完**時才重算——那一刻指標可用的資料真的多了一根。
      if (report.hasClosedAKCandle) {
        void chartIndicators.recalculateAfterKCandleClosed(report.chart)
      }
    })
}

onBeforeUnmount(() => {
  stopFollowing?.()
  followGeneration += 1
  chartIndicators.stopSettling()
})

function selectPreset(preset: KCandleChartRangePresetDto) {
  activePresetLabel.value = preset.label

  return showViewport(preset.toViewportDto(symbol.value, chart.value))
}

function showRange(range: { startTime: Date, endTime: Date }) {
  // 使用者自己拉出來的一段，就不再屬於任何一個快捷區間。
  activePresetLabel.value = null

  return showViewport(new KCandleChartViewportDto(
    symbol.value, range.startTime, range.endTime, chart.value))
}

function reload() {
  return showViewport(new KCandleChartViewportDto(
    symbol.value, visibleStartTime.value, visibleEndTime.value, chart.value))
}

// 換交易標的等於換一批資料，正在看的那一段不變。
watch(symbol, reload)

// 預設區間在進入畫面時才取，避免伺服器端與瀏覽器端取到不同的「目前時間」。
onMounted(async () => {
  presets.value = kCandleChartApplication.listRangePresets()

  void selectPreset(presets.value[0])

  try {
    strategies.value = await strategyApplication.listStrategies()

    // 上次擺著的那幾支自己回來。**要等策略清單到手**——那份清單是還原時唯一的真相：
    // 留存的是「他要哪幾支」，而那幾支可能已經被刪、改了宣告，或者現在畫不成線。
    // 取不到清單時就還原不了，那與「上次一支都沒擺」對使用者是同一件事：清單是空的。
    await chartIndicators.restoreAppliedIndicators(strategies.value)
  }
  catch {
    // 取不到策略清單只代表這一次沒有東西可挑，圖表本身照畫——
    // 為此擋掉整張圖，等於讓一個附加功能決定主功能能不能用。
    strategies.value = []
  }
})
</script>

<template>
  <section class="k-candle-chart-panel">
    <AppPanel
      title="看什麼"
      collapsible
    >
      <KCandleChartToolbar
        v-model:symbol="symbol"
        v-model:drawing="drawing"
        :trading-symbol-application="tradingSymbolApplication"
        :presets="presets"
        :active-preset-label="activePresetLabel"
        :loading="loading"
        :symbol-error="symbolError"
        @select-preset="selectPreset"
      />

      <ChartIndicatorPanel
        :selectable-strategies="chartIndicators.selectableStrategies(strategies)"
        :applied-indicator-rows="chartIndicators.appliedIndicatorRows.value"
        :color-options="chartIndicators.colorOptions"
        :pending-applied-indicator="chartIndicators.pendingAppliedIndicator.value"
        :pending-parameter-fields="chartIndicators.pendingParameterFields.value"
        :pending-parameters-message="chartIndicators.pendingParametersMessage.value"
        @apply="chartIndicators.applyIndicator"
        @change-pending-parameter-value="chartIndicators.changePendingParameterValue"
        @confirm-pending="chartIndicators.confirmPendingIndicator"
        @cancel-pending="chartIndicators.cancelPendingIndicator"
        @change-applied-parameter-value="chartIndicators.changeAppliedParameterValue"
        @remove="chartIndicators.removeAppliedIndicator"
        @change-line-color="chartIndicators.changeLineColor"
      />

      <!--
        即時停掉是「這一層停了」，不是「圖表壞了」——所以它與那幾則錯誤各自獨立，
        不搶同一個位置：圖照樣顯示手上有的，只是多一行說明。
      -->
      <AppAlert
        v-if="liveUpdateStalled"
        tone="warning"
        data-testid="live-update-stalled-alert"
      >
        即時更新已停止，正在重新連上。圖表顯示的是目前手上的資料。
      </AppAlert>

      <AppAlert
        v-if="rejectedMessage"
        tone="danger"
        data-testid="rejected-alert"
      >
        {{ rejectedMessage }}
      </AppAlert>

      <AppAlert
        v-else-if="serverErrorMessage"
        tone="danger"
        data-testid="server-error-alert"
      >
        後端出錯了（不是你看的區間有問題），請稍後重試：{{ serverErrorMessage }}
        <template #action>
          <AppButton
            variant="secondary"
            size="small"
            :disabled="loading"
            @click="reload"
          >
            重試
          </AppButton>
        </template>
      </AppAlert>

      <AppAlert
        v-else-if="backendUnreachable"
        tone="danger"
        data-testid="unreachable-alert"
      >
        連不上後端 go-trading API，請確認它已啟動，且本站來源在它的 CORS_ALLOWED_ORIGINS 名單內。
        <template #action>
          <AppButton
            variant="secondary"
            size="small"
            :disabled="loading"
            @click="reload"
          >
            重試
          </AppButton>
        </template>
      </AppAlert>

      <AppAlert
        v-else-if="loading"
        tone="info"
        data-testid="loading-alert"
      >
        取行情中…
      </AppAlert>
    </AppPanel>

    <!-- 標題說的是**畫出來的那批**是哪一檔，不是選單上剛選的那一檔——
         換標的到取回來之間有一段空窗，那段時間標題若先跳掉，
         畫面就會用新名字標著舊資料。還沒取到任何東西時才退回選單上那一檔。 -->
    <AppPanel
      :title="chart?.symbol ?? symbol"
      flush
      class="k-candle-chart-panel__chart"
    >
      <!-- 每根涵蓋多久寫在圖的標題列上：它是「正在看多長」推出來的結果，
           所以它跟著圖，不跟著控制項。 -->
      <template #meta>
        <span>每根涵蓋</span>
        <AppBadge
          variant="info"
          data-testid="interval-label"
        >
          {{ intervalLabel }}
        </AppBadge>
      </template>

      <!-- 「手上這批涵蓋到哪」是圖的註腳，不是一句要人讀的話：
           它收在面板底下那一條窄帶裡，需要對照的時候才會被看見。 -->
      <template
        v-if="chart && !chart.isEmpty"
        #footer
      >
        <span data-testid="covered-range">
          手上這批共 {{ chart.count }} 根，涵蓋
          {{ timeZone.formatDateTime(chart.coveredStartTime) }} ～
          {{ timeZone.formatDateTime(chart.coveredEndTime) }}（{{ timeZone.cityLabel }}）
        </span>
      </template>

      <p
        v-if="chart && chart.isEmpty"
        class="k-candle-chart-panel__empty"
        data-testid="empty-chart"
      >
        查無 K 線。這段區間內可能還沒有資料，或交易標的名稱與後端不同。
      </p>

      <KCandleChart
        v-else-if="chart"
        :chart="chart"
        :drawing="drawing"
        :visible-start-time="visibleStartTime"
        :visible-end-time="visibleEndTime"
        :time-zone="timeZone"
        :indicators="chartIndicators.chartIndicators.value"
        @range-change="showRange"
      />

      <!-- 一次都還沒取到（例如後端沒起來）時，圖的位置要說出「這裡本來會有一張圖」，
           而不是留一整片黑——那看起來像壞了。 -->
      <p
        v-else
        class="k-candle-chart-panel__empty"
        data-testid="idle-chart"
      >
        還沒有行情可以畫。挑一個看多長，或先確認後端起來了。
      </p>
    </AppPanel>
  </section>
</template>

<style scoped lang="scss">
.k-candle-chart-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: spacing('sm');
  min-height: 0;

  // 圖吃掉工作區剩下的所有高度——這個畫面就是為了看圖而存在的。
  &__chart {
    flex: 1;
    min-height: 20rem;
  }

  &__empty {
    margin: auto;
    padding: spacing('2xl') spacing('md');
    color: color('text-faint');
    font-size: font-size('xs');
    text-align: center;
  }
}
</style>
