<script setup lang="ts">
import KCandleChart from '~/components/molecules/KCandleChart.vue'
import KCandleChartToolbar from '~/components/molecules/KCandleChartToolbar.vue'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import type { KCandleChartApplication } from '~/application/k-candle-chart-application'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'
import type { KCandleChartRangePresetDto } from '~/domain/models/dto/k-candle-chart-range-preset-dto'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

/** 進入畫面時預先帶入的交易標的，只是省一次輸入，使用者可自行更換。 */
const DEFAULT_SYMBOL = 'BTCUSDT'

// 有機體：K 線圖表這一整塊。Application 由頁面注入——頁面只做接線，互動邏輯住在這裡。
// 這裡不做任何業務判斷：每根多粗、要不要重新取、取哪一段，全部問 Application。
const { kCandleChartApplication, tradingSymbolApplication, timeZone } = defineProps<{
  kCandleChartApplication: KCandleChartApplication
  tradingSymbolApplication: TradingSymbolApplication
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

const intervalLabel = computed(() => chart.value === null ? '—' : chart.value.interval.label)

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
  }
  finally {
    if (requestNumber === latestRequestNumber) {
      loading.value = false
    }
  }
}

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
onMounted(() => {
  presets.value = kCandleChartApplication.listRangePresets()

  void selectPreset(presets.value[0])
})
</script>

<template>
  <section class="k-candle-chart-panel">
    <AppPanel title="看什麼">
      <KCandleChartToolbar
        v-model:symbol="symbol"
        v-model:drawing="drawing"
        :trading-symbol-application="tradingSymbolApplication"
        :presets="presets"
        :active-preset-label="activePresetLabel"
        :interval-label="intervalLabel"
        :loading="loading"
        :symbol-error="symbolError"
        @select-preset="selectPreset"
      />

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

    <AppPanel
      :title="symbol"
      flush
      class="k-candle-chart-panel__chart"
    >
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
        @range-change="showRange"
      />
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
