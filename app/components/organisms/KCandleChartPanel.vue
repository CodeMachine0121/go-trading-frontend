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
import type { LiveUpdateNoticeValue } from '~/domain/models/vo/live-update-notice-vo'
import type { LiveKCandleReportDto } from '~/domain/models/dto/live-k-candle-report-dto'
import type { TradingSymbolDto } from '~/domain/models/dto/trading-symbol-dto'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'
import type { KCandleChartRangePresetDto } from '~/domain/models/dto/k-candle-chart-range-preset-dto'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { ChartVisibleRangeVo } from '~/domain/models/vo/chart-visible-range-vo'
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

/** 最近一則即時更新說了什麼。還沒有任何一則時是 null。 */
const latestLiveReport = ref<LiveKCandleReportDto | null>(null)
/** 目前選著的那一檔完整的樣子，由挑標的那個欄位交過來。 */
const selectedTradingSymbol = ref<TradingSymbolDto | null>(null)

/**
 * 圖表上該說的那一句話，至多一句。
 *
 * 該說哪一句是一條有優先序的業務規則，所以由 domain 判、這裡只問。
 * 寫成三個 v-if 的話，加第四種說法就得回頭重讀所有排列。
 */
const liveUpdateNotice = computed(() => liveKCandleApplication.liveUpdateNotice(
  selectedTradingSymbol.value, latestLiveReport.value))

/**
 * 每一種說法在畫面上是哪一句中文。
 *
 * 「沒有名額」與「停了」的措辭刻意不像：一句要人接受現況，一句要人稍等——
 * 讀起來像同一件事的話，這兩句就等於只有一句。
 */
const LIVE_UPDATE_NOTICE_MESSAGES: Record<LiveUpdateNoticeValue, string> = {
  marketClosed: '這個市場目前收盤中。圖表顯示的是收盤前的資料，開盤後會自己動起來。',
  noLivePlace: '這一檔沒有即時更新，資料每五分鐘更新一次。',
  stalled: '即時更新已停止，正在重新連上。圖表顯示的是目前手上的資料。',
}
/**
 * 這個市場會收盤，所以「等下一輪」不見得等得到東西——手動要求更新才有意義。
 *
 * 判準是**這個市場會不會收盤**，不是「現在有沒有開」：後者在收盤的每個夜裡都成立，
 * 卻也在加密貨幣身上永遠不成立，於是按鈕會在錯的地方出現、又在錯的地方消失。
 */
const canCatchUp = computed(() => selectedTradingSymbol.value?.hasTradingSession === true)

/** 正在補齊。補的時候不讓人再按一次——第二次要的是同一批東西。 */
const catchingUp = ref(false)
/** 上一次補齊的結果，補完才有話說。 */
const catchUpMessage = ref<string | null>(null)

/**
 * 去把這一檔缺的補回來，補完重畫。
 *
 * 補完一定要重畫：補齊寫的是後端的資料，畫面手上那批是**補齊之前**取的，
 * 不重取的話，剛補回來的那幾根一根都不會出現，看起來就像按了沒有用。
 */
async function catchUp() {
  catchingUp.value = true
  catchUpMessage.value = null

  try {
    const collected = await kCandleChartApplication.catchUpSymbol(symbol.value)
    // 補到零根也是一個答案，而且是常見的那一個（手上已經是最新的）。
    // 不說出來的話，看的人分不出「按了沒事」與「按了沒反應」。
    catchUpMessage.value = collected === 0
      ? '已經是最新的了，沒有可補的 K 線。'
      : `補回 ${collected} 根 K 線。`

    // 手上那批「還夠用」的判斷是拿涵蓋範圍算的，而補齊填的是**範圍之內**的洞——
    // 照平常那條路重取，它會說不必取，於是剛補回來的那幾根一根都不會出現。
    // 所以這裡明說：忘了手上那批，重新取一次。
    await showViewport(new KCandleChartViewportDto(
      symbol.value, visibleStartTime.value, visibleEndTime.value, null))
  }
  catch (error: unknown) {
    catchUpMessage.value = error instanceof Error
      ? `補不回來：${error.message}`
      : '補不回來。'
  }
  finally {
    catchingUp.value = false
  }
}

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
  rejectedMessage.value = null
  serverErrorMessage.value = null
  backendUnreachable.value = false

  // 一檔都沒選著——這個市場目前沒有東西可挑。沒有東西可問，也沒有人做錯什麼，
  // 所以這裡既不送出請求，也不標一句「請指定交易標的」：那是在怪使用者沒填，
  // 但這個畫面只能從選單挑，他根本沒有「填」這個動作可做，真正的原因挑標的
  // 那個欄位已經說了。
  if (kCandleChartViewportDto.symbol.trim() === '') {
    forgetTheChart()
    loading.value = false

    return
  }

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

    // 哨兵錯誤分流。這裡沒有「請使用者自己修正」的那一種：標的只能從選單挑，
    // 而一檔都沒選著在上面就先攔下了——剩下的每一種都是後端那頭的事。
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
 * 把手上這張圖整個放掉：圖、跟盤、最近那一則更新、算出來的線。
 *
 * 四件事必須一起放掉。留著跟盤，上一檔的下一則更新就會把圖「復活」，而畫面上
 * 同時還說著取行情失敗，看到的人會以為那張圖是這一檔的；留著線，它們畫的是另一段
 * 行情，還會在一張空圖上繼續撐著價格軸。已套用的清單留著，等圖回來自己會重算。
 */
function forgetTheChart() {
  chart.value = null
  stopFollowing?.()
  stopFollowing = null
  followGeneration += 1
  latestLiveReport.value = null
  chartIndicators.clearLines()
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

      // 跟不動了、這一檔本來就沒有即時更新、或市場收盤了：三者都明說，
      // 但圖照樣顯示手上有的——沒有的是「即時」，不是「圖表」。
      latestLiveReport.value = report
      if (report.isStalled || report.hasNoLivePlace || report.isMarketClosed) {
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
        @selected="selectedTradingSymbol = $event"
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
        @toggle-visibility="chartIndicators.toggleAppliedIndicatorVisibility"
        @remove="chartIndicators.removeAppliedIndicator"
        @change-line-color="chartIndicators.changeLineColor"
      />
    </AppPanel>

    <!--
      這幾則說的是**圖現在怎麼了**，不是控制項怎麼了，所以它們住在面板外面：
      收起「看什麼」的人收的是控制項，而一則「連不上後端」不該跟著被收走——
      那正是他最需要看到它的時候。
    -->
    <!--
      即時這一層沒有東西動，不代表「圖表壞了」——所以它與那幾則錯誤各自獨立，
      不搶同一個位置：圖照樣顯示手上有的，只是多一行說明。
      三種原因共用這一個位置，一次只說一句，哪一句由 domain model 決定。
    -->
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

        <!--
          只有會收盤的市場給這顆按鈕。永不收盤的市場永遠只差一輪就跟上了，
          給它一顆「立刻更新」只是讓人多按一次去做本來就會發生的事。
        -->
        <AppButton
          v-if="canCatchUp"
          variant="secondary"
          size="small"
          :disabled="catchingUp || loading"
          data-testid="catch-up-button"
          @click="catchUp"
        >
          {{ catchingUp ? '補齊中…' : '立刻更新' }}
        </AppButton>
        <span
          v-if="catchUpMessage"
          class="k-candle-chart-panel__catch-up-message"
          data-testid="catch-up-message"
        >
          {{ catchUpMessage }}
        </span>
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
        :indicators="chartIndicators.visibleChartIndicators.value"
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

  &__catch-up-message {
    color: color('text-faint');
    font-size: font-size('2xs');
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
