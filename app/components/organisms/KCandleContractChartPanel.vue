<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ContractSymbolField from '~/components/molecules/ContractSymbolField.vue'
import KCandleChartWorkspace from '~/components/organisms/KCandleChartWorkspace.vue'
import AppAlert from '~/components/atoms/AppAlert.vue'
import KCandleChartNotices from '~/components/molecules/KCandleChartNotices.vue'
import type { KCandleChartApplication } from '~/application/k-candle-chart-application'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import type { LiveKCandleContractApplication } from '~/application/live-k-candle-contract-application'
import type { ContractTradingSymbolDto } from '~/domain/models/dto/contract-trading-symbol-dto'
import type { LiveKCandleReportDto } from '~/domain/models/dto/live-k-candle-report-dto'
import type { LiveUpdateNoticeValue } from '~/domain/models/vo/live-update-notice-vo'
import { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'
import type { KCandleChartRangePresetDto } from '~/domain/models/dto/k-candle-chart-range-preset-dto'
import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { DrawnKCandleRangeVo } from '~/domain/models/vo/drawn-k-candle-range-vo'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import type { ChartDrawingApplication } from '~/application/chart-drawing-application'
import type { KCandleChartDrawing } from '~/domain/models/vo/k-candle-chart-drawing-vo'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/** 進入畫面時預先帶入的合約標的，只是省一次挑選，不在清單上就會被換掉。 */
const DEFAULT_SYMBOL = 'BTCUSDT'

// 有機體：合約 K 線圖表這一整塊。
//
// 看多長、每根涵蓋、要不要重新取、取哪一段，與現貨圖表問的是同一個 Application、
// 同一套判斷——這裡只換「取的是合約那一條」。即時跟盤也是現貨那一套，跟的是合約的通道。
// **沒有指標與立刻更新**：那兩樣沒有擺出來，而且畫面上明說。
const {
  kCandleChartApplication, tradingSymbolApplication, liveKCandleContractApplication, chartDrawingApplication, timeZone,
} = defineProps<{
  kCandleChartApplication: KCandleChartApplication
  tradingSymbolApplication: TradingSymbolApplication
  /** 合約那一條即時通道；與現貨圖表的那一條各跟各的。 */
  liveKCandleContractApplication: LiveKCandleContractApplication
  /** 圖上的繪圖：記在哪、怎麼改、上一步回到哪。合約與現貨的繪圖分開記。 */
  chartDrawingApplication: ChartDrawingApplication
  /** 時間軸與已取回區間用哪一個時區說。 */
  timeZone: TimeZoneDto
}>()

/** 按了看盤工作區左上角的主選單——選單在版型裡，交給頁面打開。 */
const emit = defineEmits<{ openMenu: [] }>()

const { t } = useI18n()
const { localize } = useLocalizedText()

const symbol = ref(DEFAULT_SYMBOL)
const drawing = ref<KCandleChartDrawing>('candlestick')

/** 挑合約的那個欄位——在圖上直接打字時要它打開商品搜尋。 */
const symbolField = ref<InstanceType<typeof ContractSymbolField> | null>(null)

const presets = ref<KCandleChartRangePresetDto[]>([])
const activePreset = ref<KCandleChartRangePresetDto | null>(null)

const aggregationIntervalChoices = ref<AggregationIntervalChoiceDto[]>([])
const aggregationIntervalChoice = ref<AggregationIntervalChoiceDto>(
  kCandleChartApplication.defaultAggregationIntervalChoice())

const chart = ref<KCandleChartDto | null>(null)
/** 圖上實際要畫的那一段（含右側留白），由領域回答。 */
const drawnRange = ref<DrawnKCandleRangeVo | null>(null)

/**
 * 使用者最後**要求**看的那一段。被拒絕之後換粗細、換合約再試時，
 * 要重試的是他要求的那一段，不是上一次成功畫出來的那一段——理由與現貨圖表相同。
 */
const requestedStartTime = ref(new Date())
const requestedEndTime = ref(new Date())

const loading = ref(false)
const rejectedMessage = ref<LocalizedTextVo | null>(null)
const unexpectedFailure = ref(false)
const serverErrorMessage = ref<LocalizedTextVo | null>(null)
const unreachableExplanation = ref<LocalizedTextVo | null>(null)

/** 先送出的那次可能後回來；只採用最後一次的結果。 */
let latestRequestNumber = 0

/** 目前選著的那一個合約標的的完整樣子，由挑合約那一格交過來。還不知道時是 null。 */
const selectedContractTradingSymbol = ref<ContractTradingSymbolDto | null>(null)
/** 最近一則即時更新說了什麼。還沒有任何一則時是 null。 */
const latestLiveReport = ref<LiveKCandleReportDto | null>(null)
/** 怎麼停掉現在這一條跟盤；沒在跟時是 null。 */
let stopFollowing: (() => void) | null = null
/** 每開一次或停一次就加一：之後才到的上一次的更新，一律不採用。 */
let followGeneration = 0

/** 圖上該說的那一句話，至多一句。優先序是業務規則，由 domain 判。 */
const liveUpdateNotice = computed(() => liveKCandleContractApplication.liveUpdateNotice(
  selectedContractTradingSymbol.value, latestLiveReport.value))

/**
 * 每一種說法在合約圖表上是哪一句中文。合約不收盤，所以收盤那一句不會出現；
 * 「沒有即時更新」在合約這邊的原因只有一個——不在合約追蹤名單上——所以直接說出怎麼辦。
 */
const liveUpdateNoticeMessages = computed<Record<LiveUpdateNoticeValue, string>>(() => ({
  marketClosed: t('marketData.kCandleContractChartPanel.liveUpdateMarketClosed'),
  noLivePlace: t('marketData.kCandleContractChartPanel.liveUpdateNoLivePlace'),
  ended: t('marketData.kCandleContractChartPanel.liveUpdateEnded'),
  stalled: t('marketData.common.liveUpdateStalled'),
}))

const liveUpdateNoticeMessage = computed(() => liveUpdateNotice.value === null
  ? null
  : liveUpdateNoticeMessages.value[liveUpdateNotice.value.value])

/** 選著的合約標的**確定**不在合約追蹤名單上。不知道時不算——那時照常跟。 */
const isKnownUnwatched = computed(() => selectedContractTradingSymbol.value?.isWatched === false)

const intervalLabel = computed(() => chart.value === null ? '—' : localize(chart.value.interval.label))

/**
 * 行情摘要上的標記價格、指數價格與溢價指數：畫出來的那批裡最新那一根的三條線。
 * 它跟著圖走，所以換合約的空窗期裡不會把上一個合約的數字掛在新名字底下。
 * 現貨圖、空的一批時是 null——那三格畫成「—」。
 */
const contractPrices = computed(() => chart.value?.latestContractPrices ?? null)

/** 圖的標題說的是**畫出來的那一個**合約；還沒取到任何東西時才退回選單上那一個。 */
const chartTitle = computed(() => `${chart.value?.symbol ?? symbol.value}.P`)

async function showViewport(kCandleChartViewportDto: KCandleChartViewportDto) {
  latestRequestNumber += 1
  const requestNumber = latestRequestNumber

  requestedStartTime.value = kCandleChartViewportDto.visibleStartTime
  requestedEndTime.value = kCandleChartViewportDto.visibleEndTime

  loading.value = true
  rejectedMessage.value = null
  unexpectedFailure.value = false
  serverErrorMessage.value = null
  unreachableExplanation.value = null

  // 一個都沒選著——合約那一邊目前沒有東西可挑。挑合約那一格已經說了原因，
  // 這裡不送出，也不怪使用者沒填。
  if (kCandleChartViewportDto.symbol.trim() === '') {
    forgetTheChart()
    loading.value = false

    return
  }

  try {
    const chartView = await kCandleChartApplication.loadKCandleContractChart(kCandleChartViewportDto)

    if (requestNumber === latestRequestNumber) {
      drawnRange.value = chartView.drawnRange

      // null 代表手上那批就夠了——不換資料，尤其不能把圖清掉。
      if (chartView.reloadedChart !== null) {
        chart.value = chartView.reloadedChart
        followTheMarket(chartView.reloadedChart)
      }
      // 手上那批留著、卻沒有在跟：例如先換到一個不在名單上的合約標的（那一條被停掉了），
      // 圖還沒取回就又換回來——領域說不必重取，但跟盤不能就此斷掉。
      else if (stopFollowing === null && chart.value !== null) {
        followTheMarket(chart.value)
      }
    }
  }
  catch (error: unknown) {
    if (requestNumber !== latestRequestNumber) {
      return
    }

    if (error instanceof BackendServerError) {
      serverErrorMessage.value = error.localizedMessage
    }
    else if (error instanceof BackendRequestRejectedError) {
      rejectedMessage.value = error.localizedMessage
    }
    else if (error instanceof BackendUnreachableError) {
      unreachableExplanation.value = error.localizedMessage
    }
    else {
      unexpectedFailure.value = true
    }

    forgetTheChart()
  }
  finally {
    if (requestNumber === latestRequestNumber) {
      loading.value = false
    }
  }
}

/**
 * 把手上這張圖整個放掉：圖、跟盤、最近那一則更新。三件事必須一起放掉——
 * 留著跟盤，上一個合約標的的下一則更新會把圖「復活」，而畫面上同時還說著取行情失敗。
 */
function forgetTheChart() {
  chart.value = null
  stopTheFollow()
}

function stopTheFollow() {
  stopFollowing?.()
  stopFollowing = null
  followGeneration += 1
  latestLiveReport.value = null
}

/**
 * 開始跟這一批 K 線所屬的合約標的。換一批就換一次：跟盤是把即時的變動併進**手上這一批**。
 *
 * 確定不在合約追蹤名單上的不跟——後端不會給，而瀏覽器分不出「被拒絕」與「斷了」，
 * 跟下去只會讓畫面錯說「即時更新已停止」。那時該說的那一句由提示說。
 */
function followTheMarket(followedChart: KCandleChartDto) {
  stopTheFollow()
  if (isKnownUnwatched.value) {
    return
  }

  const generation = followGeneration

  stopFollowing = liveKCandleContractApplication.followKCandles(
    followedChart.symbol, followedChart, (report) => {
      // 已經不是這一次在跟了：這一則講的是上一批、或上一個合約標的的行情。
      if (generation !== followGeneration) {
        return
      }

      // 跟不動了就由提示明說；那一則帶回來的圖就是手上這一張，照樣顯示——
      // 沒有的是「即時」，不是「圖表」。
      latestLiveReport.value = report
      chart.value = report.chart
    })
}

/**
 * 挑合約那一格說出這一個在不在名單上。圖可能先畫好、已經照「不知道」開始跟了，
 * 所以確定不在名單上時停掉那一條；換一個合約標的一定會重新取圖、重新決定要不要跟，
 * 所以這裡不必負責開。
 */
function selectContractTradingSymbol(contractTradingSymbol: ContractTradingSymbolDto | null) {
  selectedContractTradingSymbol.value = contractTradingSymbol
  if (isKnownUnwatched.value) {
    stopTheFollow()
  }
}

onBeforeUnmount(() => {
  stopTheFollow()
})

function selectPreset(preset: KCandleChartRangePresetDto) {
  activePreset.value = preset

  return showViewport(preset.toViewportDto(
    symbol.value, chart.value, aggregationIntervalChoice.value))
}

function showRange(range: { startTime: Date, endTime: Date }) {
  // 使用者自己拉出來的一段，就不再屬於任何一個快捷區間。
  activePreset.value = null

  return showViewport(new KCandleChartViewportDto(
    symbol.value, range.startTime, range.endTime, chart.value,
    aggregationIntervalChoice.value))
}

/**
 * 跳到最新：以他現在要求看的那一段長度、結束在現在重新擺位。
 * 右側留白與要不要重新取，照顯示區間原本那一套規則走。
 */
function jumpToLatest() {
  activePreset.value = null
  const now = new Date()
  const span = requestedEndTime.value.getTime() - requestedStartTime.value.getTime()

  return showViewport(new KCandleChartViewportDto(
    symbol.value, new Date(now.getTime() - span), now, chart.value,
    aggregationIntervalChoice.value))
}

function reload() {
  return showViewport(new KCandleChartViewportDto(
    symbol.value, requestedStartTime.value, requestedEndTime.value, chart.value,
    aggregationIntervalChoice.value))
}

/** 換一種粗細。看的那一段一個字都不動；要不要重新取由領域決定。 */
function selectAggregationIntervalChoice(choice: AggregationIntervalChoiceDto) {
  aggregationIntervalChoice.value = choice
}

watch(aggregationIntervalChoice, () => reload())

// 換合約等於換一批資料，正在看的那一段不變。
watch(symbol, () => reload())

onMounted(() => {
  presets.value = kCandleChartApplication.listRangePresets()
  aggregationIntervalChoices.value = kCandleChartApplication.listAggregationIntervalChoices()

  void selectPreset(kCandleChartApplication.defaultRangePreset())
})
</script>

<template>
  <KCandleChartWorkspace
    v-model:drawing="drawing"
    class="k-candle-contract-chart-panel"
    market-side="contract"
    :chart="chart"
    :drawn-range="drawnRange"
    :time-zone="timeZone"
    :symbol="chart?.symbol ?? symbol"
    :legend-title="chartTitle"
    :interval-label="intervalLabel"
    :presets="presets"
    :active-preset="activePreset"
    :aggregation-interval-choices="aggregationIntervalChoices"
    :active-aggregation-interval-choice="aggregationIntervalChoice"
    :loading="loading"
    :k-candle-chart-application="kCandleChartApplication"
    :chart-drawing-application="chartDrawingApplication"
    @select-preset="selectPreset"
    @select-aggregation-interval-choice="selectAggregationIntervalChoice"
    @range-change="showRange"
    @jump-to-latest="jumpToLatest"
    @open-menu="emit('openMenu')"
    @type-to-search="symbolField?.openSearch($event)"
  >
    <template #symbol>
      <ContractSymbolField
        ref="symbolField"
        v-model="symbol"
        presentation="search"
        :trading-symbol-application="tradingSymbolApplication"
        @selected="selectContractTradingSymbol"
      />
    </template>

    <template #market>
      <slot name="market" />
    </template>

    <!--
      合約才有的那三條，接在圖例第二行。沒有記錄的那一條畫成「—」，與 0 一眼分得出來。
      它們讀的是最新一根**記錄**，不是即時的那一根——說出它是幾點的，才不會被當成現價。
    -->
    <template
      v-if="contractPrices"
      #legendExtra
    >
      <span
        class="k-candle-contract-chart-panel__stat"
        data-testid="mark-price-stat"
      >
        <span class="k-candle-contract-chart-panel__stat-label">{{ t('marketData.kCandleContractChartPanel.markPrice') }}</span>{{ contractPrices.markPrice.toString() }}
      </span>
      <span
        class="k-candle-contract-chart-panel__stat"
        data-testid="index-price-stat"
      >
        <span class="k-candle-contract-chart-panel__stat-label">{{ t('marketData.kCandleContractChartPanel.indexPrice') }}</span>{{ contractPrices.indexPrice?.toString() ?? '—' }}
      </span>
      <span
        class="k-candle-contract-chart-panel__stat"
        data-testid="premium-index-stat"
      >
        <span class="k-candle-contract-chart-panel__stat-label">{{ t('marketData.kCandleContractChartPanel.premiumIndex') }}</span>{{ contractPrices.premiumIndex?.toString() ?? '—' }}
      </span>
      <span
        class="k-candle-contract-chart-panel__stat-label"
        data-testid="contract-prices-at"
      >
        {{ t('marketData.kCandleContractChartPanel.recordedAt', {
          time: timeZone.formatDateTime(contractPrices.recordedAt),
        }) }}
      </span>
    </template>

    <template #notices>
      <KCandleChartNotices
        :live-update-notice="liveUpdateNotice"
        :live-update-message="liveUpdateNoticeMessage"
        :rejected-message="rejectedMessage"
        :unexpected-failure="unexpectedFailure"
        :server-error-message="serverErrorMessage"
        :unreachable-explanation="unreachableExplanation"
        :loading="loading"
        @retry="reload"
      />
    </template>

    <template #empty>
      <p
        v-if="chart && chart.isEmpty"
        data-testid="empty-chart"
      >
        {{ t('marketData.kCandleContractChartPanel.emptyChart') }}
      </p>
      <p
        v-else
        data-testid="idle-chart"
      >
        {{ t('marketData.common.chartIdle') }}
      </p>
    </template>

    <!-- 合約圖表目前沒有指標：按鈕照樣在，打開之後明說。 -->
    <template #indicators>
      <AppAlert
        tone="info"
        data-testid="no-indicators-notice"
      >
        {{ t('marketData.kCandleContractChartPanel.noIndicators') }}
      </AppAlert>
    </template>
  </KCandleChartWorkspace>
</template>

<style scoped lang="scss">
.k-candle-contract-chart-panel {
  &__stat {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  &__stat-label {
    margin-right: spacing('3xs');
    color: color('chart-workspace-text-muted');
  }
}
</style>
