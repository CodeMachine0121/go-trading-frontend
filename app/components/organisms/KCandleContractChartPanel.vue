<script setup lang="ts">
import KCandleChart from '~/components/molecules/KCandleChart.vue'
import KCandleChartToolbar from '~/components/molecules/KCandleChartToolbar.vue'
import ContractSymbolField from '~/components/molecules/ContractSymbolField.vue'
import KCandleQuote from '~/components/molecules/KCandleQuote.vue'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
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
import type { LayoutDensityDto } from '~/domain/models/dto/layout-density-dto'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

/** 進入畫面時預先帶入的合約標的，只是省一次挑選，不在清單上就會被換掉。 */
const DEFAULT_SYMBOL = 'BTCUSDT'

// 有機體：合約 K 線圖表這一整塊。
//
// 看多長、每根涵蓋、要不要重新取、取哪一段，與現貨圖表問的是同一個 Application、
// 同一套判斷——這裡只換「取的是合約那一條」。即時跟盤也是現貨那一套，跟的是合約的通道。
// **沒有指標與立刻更新**：那兩樣沒有擺出來，而且畫面上明說。
const {
  kCandleChartApplication, tradingSymbolApplication, liveKCandleContractApplication, timeZone, layoutDensity,
} = defineProps<{
  kCandleChartApplication: KCandleChartApplication
  tradingSymbolApplication: TradingSymbolApplication
  /** 合約那一條即時通道；與現貨圖表的那一條各跟各的。 */
  liveKCandleContractApplication: LiveKCandleContractApplication
  /** 時間軸與已取回區間用哪一個時區說。 */
  timeZone: TimeZoneDto
  /** 這裡只用到其中一項：控制項一開始收不收。 */
  layoutDensity: LayoutDensityDto
}>()

const symbol = ref(DEFAULT_SYMBOL)
const drawing = ref<'candlestick' | 'line'>('candlestick')

const presets = ref<KCandleChartRangePresetDto[]>([])
const activePresetLabel = ref<string | null>(null)

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
const rejectedMessage = ref<string | null>(null)
const serverErrorMessage = ref<string | null>(null)
const backendUnreachable = ref(false)

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
const LIVE_UPDATE_NOTICE_MESSAGES: Record<LiveUpdateNoticeValue, string> = {
  marketClosed: '這個市場目前收盤中。',
  noLivePlace: '這個合約標的不在合約追蹤名單上，沒有即時更新——把它加進合約追蹤名單就會即時跟盤。',
  ended: '即時更新已中斷，不會自己重新連上——確認這個合約標的還在合約追蹤名單上，再重新整理頁面。圖表顯示的是目前手上的資料。',
  stalled: '即時更新已停止，正在重新連上。圖表顯示的是目前手上的資料。',
}

/** 選著的合約標的**確定**不在合約追蹤名單上。不知道時不算——那時照常跟。 */
const isKnownUnwatched = computed(() => selectedContractTradingSymbol.value?.isWatched === false)

const intervalLabel = computed(() => chart.value === null ? '—' : chart.value.interval.label)

/**
 * 行情摘要上的標記價格、指數價格與溢價指數：畫出來的那批裡最新那一根的三條線。
 * 它跟著圖走，所以換合約的空窗期裡不會把上一個合約的數字掛在新名字底下。
 * 現貨圖、空的一批時是 null——那三格畫成「—」。
 */
const contractPrices = computed(() => chart.value?.latestContractPrices ?? null)

/** 圖的標題說的是**畫出來的那一個**合約；還沒取到任何東西時才退回選單上那一個。 */
const chartTitle = computed(() => chart.value?.symbol ?? symbol.value)

async function showViewport(kCandleChartViewportDto: KCandleChartViewportDto) {
  latestRequestNumber += 1
  const requestNumber = latestRequestNumber

  requestedStartTime.value = kCandleChartViewportDto.visibleStartTime
  requestedEndTime.value = kCandleChartViewportDto.visibleEndTime

  loading.value = true
  rejectedMessage.value = null
  serverErrorMessage.value = null
  backendUnreachable.value = false

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
  activePresetLabel.value = preset.label

  return showViewport(preset.toViewportDto(
    symbol.value, chart.value, aggregationIntervalChoice.value))
}

function showRange(range: { startTime: Date, endTime: Date }) {
  // 使用者自己拉出來的一段，就不再屬於任何一個快捷區間。
  activePresetLabel.value = null

  return showViewport(new KCandleChartViewportDto(
    symbol.value, range.startTime, range.endTime, chart.value,
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
  <section class="k-candle-contract-chart-panel">
    <!--
      行情摘要：成交價最大，旁邊是合約才有的那三條。它跟著畫出來的那批資料走，
      不是選單上剛選的那一個。沒有記錄的那一條畫成「—」，與 0 一眼分得出來。
    -->
    <KCandleQuote
      v-if="chart?.latestKCandle"
      :latest="chart.latestKCandle"
      :symbol="chart.symbol"
      :time-zone="timeZone"
    >
      <template #tags>
        <AppBadge variant="accent">
          永續合約
        </AppBadge>
      </template>

      <template #stats>
        <div
          class="k-candle-contract-chart-panel__stat"
          data-testid="mark-price-stat"
        >
          <span class="k-candle-contract-chart-panel__stat-label">標記價格</span>
          <span class="k-candle-contract-chart-panel__stat-value">
            {{ contractPrices?.markPrice.toString() ?? '—' }}
          </span>
        </div>
        <div
          class="k-candle-contract-chart-panel__stat"
          data-testid="index-price-stat"
        >
          <span class="k-candle-contract-chart-panel__stat-label">指數價格</span>
          <span class="k-candle-contract-chart-panel__stat-value">
            {{ contractPrices?.indexPrice?.toString() ?? '—' }}
          </span>
        </div>
        <div
          class="k-candle-contract-chart-panel__stat"
          data-testid="premium-index-stat"
        >
          <span class="k-candle-contract-chart-panel__stat-label">溢價指數</span>
          <span class="k-candle-contract-chart-panel__stat-value">
            {{ contractPrices?.premiumIndex?.toString() ?? '—' }}
          </span>
        </div>
        <!-- 那三條讀的是最新一根**記錄**，不是即時的那一根——說出它是幾點的，才不會被當成現價。 -->
        <span
          v-if="contractPrices"
          class="k-candle-contract-chart-panel__stat-at"
          data-testid="contract-prices-at"
        >
          記錄於 {{ timeZone.formatDateTime(contractPrices.recordedAt) }}
        </span>
      </template>
    </KCandleQuote>

    <AppAlert
      v-if="liveUpdateNotice"
      :tone="liveUpdateNotice.tone"
      :data-testid="`live-update-${liveUpdateNotice.value}-alert`"
    >
      {{ LIVE_UPDATE_NOTICE_MESSAGES[liveUpdateNotice.value] }}
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

    <div class="k-candle-contract-chart-panel__workspace">
      <AppPanel
        :title="chartTitle"
        flush
        class="k-candle-contract-chart-panel__chart"
      >
        <template #meta>
          <span>每根涵蓋</span>
          <AppBadge
            variant="info"
            data-testid="interval-label"
          >
            {{ intervalLabel }}
          </AppBadge>
        </template>

        <div class="k-candle-contract-chart-panel__stage">
          <!-- 寬螢幕上在圖的上方，手機上移到圖的下方給拇指點。 -->
          <KCandleChartToolbar
            v-model:drawing="drawing"
            class="k-candle-contract-chart-panel__toolbar"
            :presets="presets"
            :active-preset-label="activePresetLabel"
            :aggregation-interval-choices="aggregationIntervalChoices"
            :active-aggregation-interval-choice="aggregationIntervalChoice"
            :loading="loading"
            @select-preset="selectPreset"
            @select-aggregation-interval-choice="selectAggregationIntervalChoice"
          />

          <p
            v-if="chart && chart.isEmpty"
            class="k-candle-contract-chart-panel__empty"
            data-testid="empty-chart"
          >
            查無 K 線。這段區間內可能還沒有資料，或這個合約還沒開始同步。
          </p>

          <KCandleChart
            v-else-if="chart"
            class="k-candle-contract-chart-panel__canvas"
            :chart="chart"
            :drawing="drawing"
            :drawn-range="drawnRange"
            :time-zone="timeZone"
            @range-change="showRange"
          />

          <p
            v-else
            class="k-candle-contract-chart-panel__empty"
            data-testid="idle-chart"
          >
            還沒有行情可以畫。挑一個看多長，或先確認後端起來了。
          </p>
        </div>

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
      </AppPanel>

      <aside class="k-candle-contract-chart-panel__side">
        <AppPanel
          title="看什麼"
          collapsible
          :initially-collapsed="layoutDensity.startsChartControlsCollapsed"
        >
          <ContractSymbolField
            v-model="symbol"
            :trading-symbol-application="tradingSymbolApplication"
            @selected="selectContractTradingSymbol"
          />
        </AppPanel>

        <!--
          這一句說的是**這張圖是什麼**，所以住在「看什麼」外面、常駐著：收起「看什麼」的人
          收的是控制項，而「這裡沒有指標」正是他找不到指標時要讀到的那一句。
        -->
        <AppAlert
          tone="info"
          data-testid="no-indicators-notice"
        >
          合約圖表沒有指標。
        </AppAlert>
      </aside>
    </div>
  </section>
</template>

<style scoped lang="scss">
.k-candle-contract-chart-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: spacing('sm');
  min-height: 0;

  // 手機上一欄由上往下：圖在前，看什麼在後。寬螢幕上圖在左、旁邊一欄固定寬。
  &__workspace {
    display: grid;
    flex: 1;
    gap: spacing('sm');
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
    min-height: 0;

    @include respond-to('lg') {
      grid-template-columns: minmax(0, 1fr) 18.75rem;
      align-items: stretch;
    }
  }

  // 圖吃掉工作區剩下的所有高度——這個畫面就是為了看圖而存在的。
  &__chart {
    min-height: 24rem;

    @include respond-to('lg') {
      min-height: 32rem;
    }
  }

  &__stage {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  &__toolbar {
    order: 2;
    border-top: 1px solid color('border');
    padding: spacing('xs');

    @include respond-to('md') {
      order: 0;
      border-top: 0;
      border-bottom: 1px solid color('border');
    }
  }

  &__canvas {
    order: 1;
  }

  &__side {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
    align-self: start;
    min-width: 0;
  }

  // 手機上是一格一格的小方塊，寬螢幕上是一排沒有框的標籤＋數字。
  &__stat {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    border: 1px solid color('border');
    border-radius: radius('sm');
    background-color: color('surface');
    padding: spacing('xs');
    min-width: 0;

    @include respond-to('md') {
      border: 0;
      background: none;
      padding: 0;
    }
  }

  &__stat-label {
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__stat-value {
    overflow: hidden;
    color: color('text-strong');
    font-weight: font-weight('medium');
    font-size: font-size('sm');
    text-overflow: ellipsis;
    white-space: nowrap;

    @include numeric;
  }

  &__stat-at {
    grid-column: 1 / -1;
    align-self: end;
    color: color('text-faint');
    font-size: font-size('2xs');

    @include numeric;
  }

  &__empty {
    order: 1;
    margin: auto;
    padding: spacing('2xl') spacing('md');
    color: color('text-faint');
    font-size: font-size('xs');
    text-align: center;
  }
}
</style>
