<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppModal from '~/components/atoms/AppModal.vue'
import AppToast from '~/components/atoms/AppToast.vue'
import KCandleChart from '~/components/molecules/KCandleChart.vue'
import KCandleChartToolbar from '~/components/molecules/KCandleChartToolbar.vue'
import KCandleChartRangeBar from '~/components/molecules/KCandleChartRangeBar.vue'
import ChartLegend from '~/components/molecules/ChartLegend.vue'
import ChartDrawingLayer from '~/components/molecules/ChartDrawingLayer.vue'
import ChartDrawingToolbar from '~/components/molecules/ChartDrawingToolbar.vue'
import ChartDrawingFloatingToolbar from '~/components/molecules/ChartDrawingFloatingToolbar.vue'
import ChartDrawingObjectTree from '~/components/molecules/ChartDrawingObjectTree.vue'
import ChartDrawingBoardNotices from '~/components/molecules/ChartDrawingBoardNotices.vue'
import type { ChartDrawingApplication } from '~/application/chart-drawing-application'
import type { KCandleChartApplication } from '~/application/k-candle-chart-application'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { KCandleChartRangePresetDto } from '~/domain/models/dto/k-candle-chart-range-preset-dto'
import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import type { AppliedIndicatorRowDto } from '~/domain/models/dto/applied-indicator-row-dto'
import type { ChartIndicatorDto } from '~/domain/models/dto/chart-indicator-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import type { DrawnKCandleRangeVo } from '~/domain/models/vo/drawn-k-candle-range-vo'
import type { KCandleChartDrawing } from '~/domain/models/vo/k-candle-chart-drawing-vo'
import type { PriceScaleMode } from '~/domain/models/vo/price-scale-mode-vo'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'
import { ChartDrawingCommandDto } from '~/domain/models/dto/chart-drawing-command-dto'

/**
 * 有機體：看盤工作區，照 TradingView Supercharts 的版面——
 * 上方細邊換標的、刻度、畫法、指標；左邊細邊是繪圖工具；下方細邊是快捷區間與價格軸設定；
 * 右邊細邊打開物件樹；其餘整片是圖。
 *
 * 現貨與合約兩個面板共用它：取資料、跟盤、指標、補齊的規則都留在面板裡，
 * 面板只透過 slot 補上各自不同的那幾塊（交易標的、現貨／合約、圖例第二行、指標、補齊、狀態說明、空的時候說什麼）。
 * 繪圖整塊住在這裡——兩邊的繪圖規則一模一樣，只差屬於哪一邊。
 */
const {
  chart,
  drawnRange = null,
  timeZone,
  indicators = [],
  marketSide,
  symbol,
  legendTitle,
  intervalLabel,
  appliedIndicatorRows = [],
  presets,
  activePreset = null,
  aggregationIntervalChoices,
  activeAggregationIntervalChoice,
  loading = false,
  kCandleChartApplication,
  chartDrawingApplication,
  drawingBoardRefreshSignal = 0,
} = defineProps<{
  chart: KCandleChartDto | null
  drawnRange?: DrawnKCandleRangeVo | null
  timeZone: TimeZoneDto
  indicators?: readonly ChartIndicatorDto[]
  marketSide: MarketSideVo
  /** 畫出來的那一檔——繪圖跟著它。 */
  symbol: string
  legendTitle: string
  intervalLabel: string
  appliedIndicatorRows?: readonly AppliedIndicatorRowDto[]
  presets: readonly KCandleChartRangePresetDto[]
  activePreset?: KCandleChartRangePresetDto | null
  aggregationIntervalChoices: AggregationIntervalChoiceDto[]
  activeAggregationIntervalChoice: AggregationIntervalChoiceDto
  loading?: boolean
  kCandleChartApplication: KCandleChartApplication
  chartDrawingApplication: ChartDrawingApplication
  /** 每次變動就重讀一次帳號裡的繪圖（例如站內助手剛答完一則）。 */
  drawingBoardRefreshSignal?: number
}>()

const drawing = defineModel<KCandleChartDrawing>('drawing', { required: true })

const emit = defineEmits<{
  selectPreset: [preset: KCandleChartRangePresetDto]
  selectAggregationIntervalChoice: [choice: AggregationIntervalChoiceDto]
  rangeChange: [range: { startTime: Date, endTime: Date }]
  /** 按了「跳到最新」：以目前看的長度、結束在現在重新擺位。 */
  jumpToLatest: []
  /** 在圖上直接打了一個英文字母：打開商品搜尋並帶著它。 */
  typeToSearch: [letter: string]
  toggleIndicatorVisibility: [appliedIndicatorId: number]
  removeIndicator: [appliedIndicatorId: number]
  /** 按了左上角的主選單。選單本身在版型裡，由頁面接過去打開。 */
  openMenu: []
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()

/* ── 繪圖 ── */
const drawings = useChartDrawings(
  chartDrawingApplication, marketSide, toRef(() => symbol), toRef(() => drawingBoardRefreshSignal))

/* ── 圖 ── */
const priceScaleMode = ref<PriceScaleMode>('normal')
const autoScale = ref(true)
const hoveredIndex = ref<number | null>(null)
const latestVisible = ref(true)
const indicatorDialogOpen = ref(false)
/** 成交量疊圖：一進畫面是開的；收起來只在這一次看盤中有效。 */
const volumeShown = ref(true)
const objectTreeOpen = ref(false)
/** 手機上繪圖工具收起來，由圖左下角的鉛筆叫出來。 */
const drawingToolsOpen = ref(false)

/** 時鐘與收盤倒數每秒走一格。 */
const now = ref(new Date())
let clockTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  clockTimer = setInterval(() => {
    now.value = new Date()
  }, 1000)
})
onBeforeUnmount(() => {
  if (clockTimer !== null) {
    clearInterval(clockTimer)
  }
  window.removeEventListener('keydown', onKeydown)
})

const readout = computed(() => chart === null || chart.isEmpty
  ? null
  : kCandleChartApplication.describeReadout(chart, hoveredIndex.value, now.value))

const drawsChart = computed(() => chart !== null && !chart.isEmpty)

const coveredRangeCaption = computed(() => drawsChart.value && chart !== null
  ? t('marketData.common.coveredRange', {
      count: chart.count,
      startTime: timeZone.formatDateTime(chart.coveredStartTime),
      endTime: timeZone.formatDateTime(chart.coveredEndTime),
      cityName: localize(timeZone.cityName),
    }, chart.count)
  : null)

/* ── 提示 ── */
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(message: string) {
  toastMessage.value = message
  if (toastTimer !== null) {
    clearTimeout(toastTimer)
  }
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 3000)
}

watch(drawings.announcement, (announcement) => {
  if (announcement !== null) {
    showToast(localize(announcement))
  }
})

function removeAllDrawings() {
  const removedCount = drawings.removeAllDrawings()
  showToast(removedCount === 0
    ? t('marketData.chartDrawing.nothingToRemove')
    : t('marketData.chartDrawing.removedAll', { count: removedCount }, removedCount))
}

function toggleDrawingSwitch(name: 'magnet' | 'stayInDrawingMode' | 'lockAllDrawings' | 'hideAllDrawings') {
  drawings[name].value = !drawings[name].value
}

function pickTool(value: Parameters<typeof drawings.pickTool>[0]) {
  drawings.pickTool(value)
  drawingToolsOpen.value = false
}

/* ── 快捷鍵 ── */

/** 正在輸入框裡打字、或有對話框／主選單開著時，快捷鍵都不作用（主選單也是一張對話框）。 */
function shortcutsSuspended(event: KeyboardEvent): boolean {
  const target = event.target
  const typing = target instanceof HTMLElement
    && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

  return typing || document.querySelector('[aria-modal="true"]') !== null
}

function onKeydown(event: KeyboardEvent) {
  if (shortcutsSuspended(event)) {
    return
  }

  const withCommand = event.metaKey || event.ctrlKey
  if (withCommand && event.code === 'KeyZ') {
    event.preventDefault()
    if (event.shiftKey) {
      drawings.redo()
    }
    else {
      drawings.undo()
    }
    return
  }
  if (withCommand && event.code === 'KeyY') {
    event.preventDefault()
    drawings.redo()
    return
  }
  if (event.altKey && drawings.pickToolByShortcut(event.code, event.shiftKey)) {
    event.preventDefault()
    return
  }
  if (event.key === 'Escape') {
    drawings.returnToCursor()
    return
  }
  const selected = drawings.selectedDrawing.value
  if ((event.key === 'Delete' || event.key === 'Backspace') && selected !== null) {
    event.preventDefault()
    drawings.removeDrawing(selected.id)
    return
  }
  if (!withCommand && !event.altKey && /^[a-z]$/i.test(event.key)) {
    event.preventDefault()
    emit('typeToSearch', event.key.toUpperCase())
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})
</script>

<template>
  <section
    class="k-candle-chart-workspace"
    :class="{
      'k-candle-chart-workspace--with-object-tree': objectTreeOpen,
      'k-candle-chart-workspace--drawing-tools-open': drawingToolsOpen,
    }"
    data-testid="k-candle-chart-workspace"
  >
    <!-- 上方細邊 -->
    <header class="k-candle-chart-workspace__top">
      <AppButton
        variant="chrome"
        :label="t('marketData.chartWorkspace.openMenu')"
        data-testid="open-workspace-menu"
        @click="emit('openMenu')"
      >
        <AppIcon
          name="menu"
          stroke="fine"
        />
      </AppButton>

      <slot name="symbol" />

      <div class="k-candle-chart-workspace__market">
        <slot name="market" />
      </div>

      <span class="k-candle-chart-workspace__separator" />

      <KCandleChartToolbar
        v-model:drawing="drawing"
        :aggregation-interval-choices="aggregationIntervalChoices"
        :active-aggregation-interval-choice="activeAggregationIntervalChoice"
        :loading="loading"
        @select-aggregation-interval-choice="emit('selectAggregationIntervalChoice', $event)"
      />

      <AppButton
        variant="chrome"
        data-testid="open-indicators"
        @click="indicatorDialogOpen = true"
      >
        <AppIcon
          name="indicators"
          stroke="fine"
        />
        <span class="k-candle-chart-workspace__wide-only">{{ t('marketData.chartWorkspace.indicators') }}</span>
      </AppButton>

      <span class="k-candle-chart-workspace__separator k-candle-chart-workspace__wide-only" />

      <AppButton
        variant="chrome"
        class="k-candle-chart-workspace__wide-only"
        :label="t('marketData.chartDrawing.undo')"
        :disabled="!drawings.board.value.canUndo"
        data-testid="undo-drawing"
        @click="drawings.undo"
      >
        <AppIcon
          name="undo"
          stroke="fine"
        />
      </AppButton>
      <AppButton
        variant="chrome"
        class="k-candle-chart-workspace__wide-only"
        :label="t('marketData.chartDrawing.redo')"
        :disabled="!drawings.board.value.canRedo"
        data-testid="redo-drawing"
        @click="drawings.redo"
      >
        <AppIcon
          name="redo"
          stroke="fine"
        />
      </AppButton>

      <span class="k-candle-chart-workspace__spacer" />

      <slot name="topBarEnd" />
    </header>

    <!-- 左邊細邊：繪圖工具 -->
    <ChartDrawingToolbar
      class="k-candle-chart-workspace__tools"
      :tool-groups="drawings.toolGroups"
      :remembered-tools="drawings.rememberedTools.value"
      :active-drawing-kind="drawings.activeDrawingKind.value"
      :cursor-style="drawings.cursorStyle.value"
      :toggles="{
        magnet: drawings.magnet.value,
        stayInDrawingMode: drawings.stayInDrawingMode.value,
        lockAllDrawings: drawings.lockAllDrawings.value,
        hideAllDrawings: drawings.hideAllDrawings.value,
      }"
      @press-group="drawings.pressToolGroup"
      @pick-tool="pickTool"
      @toggle="toggleDrawingSwitch"
      @remove-all="removeAllDrawings"
    />

    <!-- 圖 -->
    <main class="k-candle-chart-workspace__stage">
      <KCandleChart
        v-if="drawsChart && chart"
        class="k-candle-chart-workspace__chart"
        :chart="chart"
        :drawing="drawing"
        :drawn-range="drawnRange"
        :time-zone="timeZone"
        :indicators="indicators"
        :price-scale-mode="priceScaleMode"
        :auto-scale="autoScale"
        :shows-volume="volumeShown"
        :cursor-style="drawings.activeDrawingKind.value === null ? drawings.cursorStyle.value : 'cross'"
        @range-change="emit('rangeChange', $event)"
        @crosshair-move="hoveredIndex = $event"
        @latest-visibility-change="latestVisible = $event"
        @auto-scale-change="autoScale = $event"
      >
        <template #overlay="{ coordinateSpace }">
          <ChartDrawingLayer
            :coordinate-space="coordinateSpace"
            :chart="chart"
            :chart-drawing-application="chartDrawingApplication"
            :drawings="drawings.shownDrawings.value"
            :selected-drawing-id="drawings.selectedDrawing.value?.id ?? null"
            :active-drawing-kind="drawings.activeDrawingKind.value"
            :cursor-style="drawings.cursorStyle.value"
            :magnet="drawings.magnet.value"
            :lock-all-drawings="drawings.lockAllDrawings.value"
            :countdown="readout?.countdown ?? null"
            :time-zone="timeZone"
            @finish="drawings.finishDrawing"
            @select="drawings.selectDrawing"
            @change="drawings.changeDrawing"
          />
        </template>
      </KCandleChart>

      <div
        v-else
        class="k-candle-chart-workspace__empty"
      >
        <slot name="empty" />
      </div>

      <ChartLegend
        class="k-candle-chart-workspace__legend"
        :title="legendTitle"
        :interval-label="intervalLabel"
        :readout="readout"
        :applied-indicator-rows="appliedIndicatorRows"
        :volume-shown="volumeShown"
        @toggle-volume="volumeShown = !volumeShown"
        @toggle-visibility="emit('toggleIndicatorVisibility', $event)"
        @remove="emit('removeIndicator', $event)"
      >
        <template
          v-if="$slots.legendExtra"
          #extra
        >
          <slot name="legendExtra" />
        </template>
      </ChartLegend>

      <!-- 圖的狀態說明浮在上緣中間，不推動圖。 -->
      <div
        class="k-candle-chart-workspace__notices"
        aria-live="polite"
      >
        <slot name="notices" />
        <ChartDrawingBoardNotices
          :load-failure="drawings.loadFailure.value"
          :save-failure="drawings.saveFailure.value"
          :migration-failure="drawings.migrationFailure.value"
          @retry-load="drawings.reloadBoard"
          @retry-save="drawings.retrySave"
        />
      </div>

      <ChartDrawingFloatingToolbar
        v-if="drawings.selectedDrawing.value"
        :drawing="drawings.selectedDrawing.value"
        @command="drawings.changeDrawing(drawings.selectedDrawing.value.id, $event)"
        @remove="drawings.removeDrawing(drawings.selectedDrawing.value.id)"
      />

      <AppButton
        v-if="drawsChart && !latestVisible"
        variant="chrome"
        class="k-candle-chart-workspace__to-latest"
        :label="t('marketData.chartWorkspace.jumpToLatest')"
        data-testid="jump-to-latest"
        @click="emit('jumpToLatest')"
      >
        <AppIcon
          name="to-latest"
          stroke="fine"
        />
      </AppButton>

      <AppButton
        variant="chrome"
        class="k-candle-chart-workspace__pencil"
        :label="t('marketData.chartDrawing.toolbarLabel')"
        :aria-pressed="drawingToolsOpen"
        data-testid="toggle-drawing-tools"
        @click="drawingToolsOpen = !drawingToolsOpen"
      >
        <AppIcon
          name="pencil"
          stroke="fine"
        />
      </AppButton>
    </main>

    <!-- 物件樹 -->
    <ChartDrawingObjectTree
      v-if="objectTreeOpen"
      class="k-candle-chart-workspace__panel"
      :drawings="drawings.board.value.drawings"
      :assistant-drawing-count="drawings.board.value.assistantDrawingCount"
      :selected-drawing-id="drawings.selectedDrawing.value?.id ?? null"
      @select="drawings.selectDrawing"
      @toggle-visible="drawings.changeDrawing($event, new ChartDrawingCommandDto('toggleVisible'))"
      @remove="drawings.removeDrawing"
      @remove-assistant-drawings="drawings.removeAssistantDrawings"
      @close="objectTreeOpen = false"
    />

    <!-- 右邊細邊 -->
    <aside class="k-candle-chart-workspace__rail">
      <AppButton
        variant="chrome"
        :label="t('marketData.chartDrawing.objectTree')"
        :aria-pressed="objectTreeOpen"
        data-testid="toggle-object-tree"
        @click="objectTreeOpen = !objectTreeOpen"
      >
        <AppIcon
          name="object-tree"
          stroke="fine"
        />
      </AppButton>
    </aside>

    <!-- 下方細邊 -->
    <KCandleChartRangeBar
      v-model:price-scale-mode="priceScaleMode"
      v-model:auto-scale="autoScale"
      class="k-candle-chart-workspace__bottom"
      :presets="presets"
      :active-preset="activePreset"
      :loading="loading"
      :now="now"
      :time-zone="timeZone"
      :covered-range-caption="coveredRangeCaption"
      @select-preset="emit('selectPreset', $event)"
    />

    <AppModal
      :open="indicatorDialogOpen"
      :title="t('marketData.chartWorkspace.indicatorsTitle')"
      @close="indicatorDialogOpen = false"
    >
      <slot name="indicators" />
    </AppModal>

    <AppToast :message="toastMessage" />
  </section>
</template>

<style scoped lang="scss">
// 四條細邊＋一片圖。細邊之間是一道細縫，與 TradingView 一樣用底色當縫，不畫框線。
.k-candle-chart-workspace {
  display: grid;
  grid-template:
    'top' auto
    'stage' minmax(0, 1fr)
    'bottom' auto / minmax(0, 1fr);
  position: relative;
  gap: spacing('3xs');
  background-color: color('chart-workspace-seam');
  height: 100%;
  min-height: 0;
  color: color('chart-workspace-text');

  @include respond-to('md') {
    grid-template-areas:
      'top top top'
      'tools stage rail'
      'tools bottom rail';
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  &--with-object-tree {
    @include respond-to('md') {
      grid-template-areas:
        'top top top top'
        'tools stage panel rail'
        'tools bottom panel rail';
      grid-template-columns: auto minmax(0, 1fr) 18.75rem auto;
    }
  }

  &__top {
    display: flex;
    grid-area: top;
    gap: spacing('3xs');
    align-items: center;
    background-color: color('chart-workspace-surface');
    padding: spacing('3xs') spacing('2xs');
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }

  &__market {
    display: none;

    @include respond-to('md') {
      display: block;
    }
  }

  &__wide-only {
    display: none;

    @include respond-to('md') {
      display: inline-flex;
    }
  }

  &__separator {
    flex: none;
    background-color: color('chart-workspace-seam');
    width: 1px;
    height: font-size('xl');
  }

  &__spacer {
    flex: 1;
  }

  // 手機上繪圖工具浮在圖的左邊，由鉛筆叫出來；寬螢幕上它是一條固定的細邊。
  &__tools {
    display: none;
    grid-area: tools;
    background-color: color('chart-workspace-surface');
    width: 3.25rem;

    @include respond-to('md') {
      display: flex;
    }
  }

  &--drawing-tools-open &__tools {
    position: absolute;
    z-index: z-index('chrome');
    top: spacing('2xl');
    bottom: spacing('2xl');
    left: 0;
    display: flex;
    box-shadow: shadow('md');

    @include respond-to('md') {
      position: static;
      box-shadow: none;
    }
  }

  &__stage {
    position: relative;
    display: flex;
    grid-area: stage;
    background-color: color('chart-workspace-surface');
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }

  &__chart {
    flex: 1;
  }

  &__empty {
    display: grid;
    flex: 1;
    place-items: center;
    padding: spacing('lg');
    color: color('chart-workspace-text-muted');
    font-size: font-size('sm');
    text-align: center;
  }

  &__legend {
    position: absolute;
    z-index: 2;
    top: spacing('2xs');
    right: 5rem;
    left: spacing('xs');
  }

  // 提示浮在圖的上緣中間，排在浮動工具列下面，兩者同時出現時不互相蓋住。
  // 手機上圖例會折成兩三行，提示再往下讓一點，不蓋住開高低收。
  // 墊一層實心的底，淡色的提示疊在 K 線上才讀得出來；沒有提示時它沒有高度，看不見。
  &__notices {
    position: absolute;
    z-index: 4;
    top: calc(#{spacing('2xl')} * 2.5);
    left: 50%;
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    border-radius: radius('sm');
    background-color: color('chart-workspace-surface');
    width: min(32rem, calc(100% - #{spacing('2xl')} * 3));
    transform: translateX(-50%);

    @include respond-to('md') {
      top: calc(#{spacing('2xl')} + #{spacing('lg')});
    }
  }

  &__to-latest {
    position: absolute;
    z-index: 2;
    right: spacing('2xl');
    bottom: spacing('2xl');
    box-shadow: shadow('md');
    background-color: color('chart-workspace-popover');
  }

  // 鉛筆只在手機上出現。
  &__pencil {
    position: absolute;
    z-index: 2;
    bottom: spacing('2xl');
    left: spacing('xs');
    box-shadow: shadow('md');
    border-radius: radius('pill');
    background-color: color('chart-workspace-popover');

    @include respond-to('md') {
      display: none;
    }
  }

  &__panel {
    display: none;
    grid-area: panel;
    background-color: color('chart-workspace-surface');

    @include respond-to('md') {
      display: flex;
    }
  }

  &__rail {
    display: none;
    grid-area: rail;
    flex-direction: column;
    align-items: center;
    background-color: color('chart-workspace-surface');
    padding: spacing('2xs');

    @include respond-to('md') {
      display: flex;
    }
  }

  &__bottom {
    grid-area: bottom;
    background-color: color('chart-workspace-surface');
    min-height: 1.875rem;
  }
}
</style>
