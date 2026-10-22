<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import type { ChartDrawingToolGroupDto } from '~/domain/models/dto/chart-drawing-tool-group-dto'
import type { ChartDrawingToolDto } from '~/domain/models/dto/chart-drawing-tool-dto'
import type { ChartCursorStyleValue } from '~/domain/models/vo/chart-cursor-style-vo'
import type { ChartDrawingKindValue } from '~/domain/models/vo/chart-drawing-kind-vo'

type ToolValue = ChartCursorStyleValue | ChartDrawingKindValue
type ToggleName = 'magnet' | 'lockAllDrawings' | 'hideAllDrawings'

/**
 * 分子：左邊細邊上的繪圖工具，照 TradingView 的樣子。
 *
 * 同類的工具收在同一格，格子右側的小箭頭展開那一類的其他工具；
 * 每一格顯示的是它**記得的那一個**。下面是三個開關與「移除所有繪圖」。
 */
const {
  toolGroups,
  rememberedTools,
  activeDrawingKind = null,
  cursorStyle,
  toggles,
} = defineProps<{
  toolGroups: readonly ChartDrawingToolGroupDto[]
  /** 每一格記得的工具。 */
  rememberedTools: Readonly<Record<string, ToolValue>>
  activeDrawingKind?: ChartDrawingKindValue | null
  cursorStyle: ChartCursorStyleValue
  toggles: Readonly<Record<ToggleName, boolean>>
}>()

const emit = defineEmits<{
  pressGroup: [group: ChartDrawingToolGroupDto['value']]
  pickTool: [tool: ToolValue]
  toggle: [toggle: ToggleName]
  removeAll: []
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()

/** 工具的值對到哪一個圖示。圖示是畫面的事，不放進領域。 */
const TOOL_ICONS: Record<ToolValue, 'cursor-cross' | 'cursor-dot' | 'cursor-arrow' | 'trend-line' | 'ray' | 'horizontal-line' | 'horizontal-ray' | 'vertical-line' | 'fibonacci' | 'rectangle' | 'date-price-range' | 'brush'> = {
  cross: 'cursor-cross',
  dot: 'cursor-dot',
  arrow: 'cursor-arrow',
  trendLine: 'trend-line',
  ray: 'ray',
  horizontalLine: 'horizontal-line',
  horizontalRay: 'horizontal-ray',
  verticalLine: 'vertical-line',
  fibonacciRetracement: 'fibonacci',
  rectangle: 'rectangle',
  dateAndPriceRange: 'date-price-range',
  brush: 'brush',
}

const toggleButtons = computed<readonly { name: ToggleName, icon: 'magnet' | 'lock' | 'hidden', label: string }[]>(() => [
  { name: 'magnet', icon: 'magnet', label: t('marketData.chartDrawing.magnet') },
  { name: 'lockAllDrawings', icon: 'lock', label: t('marketData.chartDrawing.lockAllDrawings') },
  { name: 'hideAllDrawings', icon: 'hidden', label: t('marketData.chartDrawing.hideAllDrawings') },
])

/** 展開中的那一格；同時只展開一格。 */
const expandedGroup = ref<ChartDrawingToolGroupDto['value'] | null>(null)

/**
 * 展開的那一列浮在格子右邊、以視窗為準定位：細邊本身會捲動，
 * 留在它裡面的話整列會被它裁掉，一個都看不到。
 */
const flyoutPosition = ref<{ top: number, left: number } | null>(null)

function toggleExpanded(group: ChartDrawingToolGroupDto['value'], event: MouseEvent) {
  if (expandedGroup.value === group) {
    collapse()
    return
  }

  const cell = (event.currentTarget as HTMLElement).parentElement
  const bounds = cell?.getBoundingClientRect()
  flyoutPosition.value = bounds === undefined ? null : { top: bounds.top, left: bounds.right }
  expandedGroup.value = group
}

function collapse() {
  expandedGroup.value = null
}

let stopListening: AbortController | null = null

watch(expandedGroup, (group) => {
  stopListening?.abort()
  stopListening = group === null ? null : new AbortController()
  if (stopListening === null) {
    return
  }

  const { signal } = stopListening
  window.addEventListener('pointerdown', (event) => {
    if (!(event.target instanceof Element) || event.target.closest('.chart-drawing-toolbar__flyout, .chart-drawing-toolbar__expand') === null) {
      collapse()
    }
  }, { capture: true, signal })
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      collapse()
    }
  }, { signal })
  window.addEventListener('resize', collapse, { signal })
  window.addEventListener('scroll', collapse, { capture: true, signal })
})

onBeforeUnmount(() => stopListening?.abort())

function currentToolOf(group: ChartDrawingToolGroupDto): ChartDrawingToolDto | undefined {
  const remembered = rememberedTools[group.value]
  return group.tools.find(tool => tool.value === remembered) ?? group.tools[0]
}

/** 這一格現在是不是在用：游標那一格看的是「沒有繪圖工具」，其餘看正在用的是不是它記得的那一個。 */
function isGroupActive(group: ChartDrawingToolGroupDto): boolean {
  return group.value === 'cursor'
    ? activeDrawingKind === null
    : activeDrawingKind !== null && currentToolOf(group)?.value === activeDrawingKind
}

function isToolActive(tool: ChartDrawingToolDto): boolean {
  return tool.value === activeDrawingKind || (activeDrawingKind === null && tool.value === cursorStyle)
}

function pick(tool: ChartDrawingToolDto) {
  collapse()
  emit('pickTool', tool.value)
}

function titleOf(tool: ChartDrawingToolDto | undefined): string {
  if (tool === undefined) {
    return ''
  }
  return tool.shortcutLabel === null ? localize(tool.label) : `${localize(tool.label)} (${tool.shortcutLabel})`
}
</script>

<template>
  <nav
    class="chart-drawing-toolbar"
    :aria-label="t('marketData.chartDrawing.toolbarLabel')"
    data-testid="chart-drawing-toolbar"
  >
    <template
      v-for="(group, index) in toolGroups"
      :key="group.value"
    >
      <div class="chart-drawing-toolbar__group">
        <AppButton
          variant="chrome"
          class="chart-drawing-toolbar__tool"
          :label="titleOf(currentToolOf(group))"
          :aria-pressed="isGroupActive(group)"
          :data-testid="`drawing-tool-group-${group.value}`"
          @click="emit('pressGroup', group.value)"
        >
          <AppIcon
            :name="TOOL_ICONS[currentToolOf(group)?.value ?? 'cross']"
            stroke="fine"
          />
        </AppButton>
        <button
          v-if="group.tools.length > 1"
          type="button"
          class="chart-drawing-toolbar__expand"
          :aria-label="t('marketData.chartDrawing.moreTools', { group: localize(group.label) })"
          :aria-expanded="expandedGroup === group.value"
          :data-testid="`expand-drawing-tools-${group.value}`"
          @click="toggleExpanded(group.value, $event)"
        >
          <AppIcon
            name="chevron"
            size="small"
          />
        </button>

        <div
          v-if="expandedGroup === group.value"
          class="chart-drawing-toolbar__flyout"
          role="menu"
          :style="flyoutPosition === null ? undefined : { top: `${flyoutPosition.top}px`, left: `${flyoutPosition.left}px` }"
        >
          <button
            v-for="tool in group.tools"
            :key="tool.value"
            type="button"
            role="menuitem"
            class="chart-drawing-toolbar__flyout-item"
            :class="{ 'chart-drawing-toolbar__flyout-item--active': isToolActive(tool) }"
            :data-testid="`drawing-tool-${tool.value}`"
            @click="pick(tool)"
          >
            <AppIcon
              :name="TOOL_ICONS[tool.value]"
              stroke="fine"
            />
            <span>{{ localize(tool.label) }}</span>
            <kbd
              v-if="tool.shortcutLabel"
              class="chart-drawing-toolbar__shortcut"
            >{{ tool.shortcutLabel }}</kbd>
          </button>
        </div>
      </div>
      <span
        v-if="index === 0"
        class="chart-drawing-toolbar__separator"
      />
    </template>

    <span class="chart-drawing-toolbar__separator" />

    <AppButton
      v-for="toggle in toggleButtons"
      :key="toggle.name"
      variant="chrome"
      class="chart-drawing-toolbar__tool"
      :label="toggle.label"
      :aria-pressed="toggles[toggle.name]"
      :data-testid="`drawing-toggle-${toggle.name}`"
      @click="emit('toggle', toggle.name)"
    >
      <AppIcon
        :name="toggle.icon"
        stroke="fine"
      />
    </AppButton>

    <AppButton
      variant="chrome"
      class="chart-drawing-toolbar__tool"
      :label="t('marketData.chartDrawing.removeAllDrawings')"
      data-testid="remove-all-drawings"
      @click="emit('removeAll')"
    >
      <AppIcon
        name="delete"
        stroke="fine"
      />
    </AppButton>
  </nav>
</template>

<style scoped lang="scss">
.chart-drawing-toolbar {
  display: flex;
  flex-direction: column;
  gap: spacing('3xs');
  align-items: center;
  padding: spacing('2xs') 0;
  overflow-y: auto;

  &__group {
    position: relative;
    display: flex;
    justify-content: center;
    width: 100%;
  }

  &__tool {
    aspect-ratio: 1;
    padding: spacing('2xs');
  }

  // 格子右側的小箭頭：平時看不見，滑過那一格才出現——與 TradingView 一樣。
  &__expand {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    display: grid;
    place-items: center;
    opacity: 0;
    border: 0;
    border-radius: radius('xs');
    background: none;
    cursor: pointer;
    padding: 0;
    color: color('chart-workspace-text-muted');
    transform: rotate(-90deg);
  }

  &__group:hover &__expand,
  &__expand:focus-visible,
  &__expand[aria-expanded='true'] {
    opacity: 1;
  }

  &__flyout {
    position: fixed;
    z-index: z-index('chrome');
    box-shadow: shadow('md');
    border-radius: radius('sm');
    background-color: color('chart-workspace-popover');
    padding: spacing('2xs') 0;
    min-width: 13rem;
  }

  &__flyout-item {
    display: flex;
    gap: spacing('xs');
    align-items: center;
    border: 0;
    background: none;
    cursor: pointer;
    padding: spacing('2xs') spacing('sm');
    width: 100%;
    color: color('chart-workspace-text');
    font-size: font-size('sm');
    text-align: left;
    white-space: nowrap;

    &:hover {
      background-color: color('chart-workspace-hover');
    }

    &--active {
      color: color('chart-workspace-accent');
    }
  }

  &__shortcut {
    margin-left: auto;
    padding-left: spacing('lg');
    color: color('chart-workspace-text-muted');
    font-family: inherit;
    font-size: font-size('xs');
  }

  &__separator {
    margin: spacing('2xs') 0;
    background-color: color('chart-workspace-seam');
    width: 70%;
    height: 1px;
  }
}
</style>
