<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import type { ChartDrawingDto } from '~/domain/models/dto/chart-drawing-dto'
import { ChartDrawingCommandDto } from '~/domain/models/dto/chart-drawing-command-dto'
import { CHART_DRAWING_COLORS } from '~/domain/models/vo/chart-drawing-color-vo'

/**
 * 分子：選取一個繪圖時浮在圖上緣的那一小條——線色、線寬、線型、鎖定、刪除。
 *
 * 左端的把手可以把它拖到別處；拖過的位置在這一次看盤中記著，不留存。
 * 固定配色的那兩種（斐波那契回撤、日期與價格範圍）沒有線色、線寬、線型三顆。
 */
const { drawing } = defineProps<{ drawing: ChartDrawingDto }>()

const emit = defineEmits<{
  command: [command: ChartDrawingCommandDto]
  remove: []
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()

const paletteOpen = ref(false)
/** 拖過之後的位置（相對圖的左上角）；沒拖過時是 `null`，停在上緣中間。 */
const position = ref<{ left: number, top: number } | null>(null)
const toolbar = ref<HTMLElement | null>(null)

const lineStyleLabels = computed(() => ({
  solid: t('marketData.chartDrawing.solidLine'),
  dashed: t('marketData.chartDrawing.dashedLine'),
  dotted: t('marketData.chartDrawing.dottedLine'),
}))

function changeColor(token: string) {
  paletteOpen.value = false
  emit('command', new ChartDrawingCommandDto('changeColor', [], token))
}

/** 拖動中的那一組監聽；拖完、被取消或工具列消失時都要收掉。 */
let stopDragging: (() => void) | null = null

function startDragging(event: PointerEvent) {
  const element = toolbar.value
  const container = element?.parentElement
  if (element === null || container === null || container === undefined) {
    return
  }

  const containerBounds = container.getBoundingClientRect()
  const bounds = element.getBoundingClientRect()
  const grabX = event.clientX - bounds.left
  const grabY = event.clientY - bounds.top

  const move = (moveEvent: PointerEvent) => {
    position.value = {
      left: Math.max(0, Math.min(containerBounds.width - bounds.width, moveEvent.clientX - containerBounds.left - grabX)),
      top: Math.max(0, Math.min(containerBounds.height - bounds.height, moveEvent.clientY - containerBounds.top - grabY)),
    }
  }
  stopDragging?.()
  stopDragging = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', stop)
    window.removeEventListener('pointercancel', stop)
    stopDragging = null
  }
  const stop = () => stopDragging?.()
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', stop)
  window.addEventListener('pointercancel', stop)
}

// 拖到一半工具列就不見了（例如上一步把那個繪圖拿掉了）：監聽不能留在視窗上。
onBeforeUnmount(() => stopDragging?.())
</script>

<template>
  <div
    ref="toolbar"
    class="chart-drawing-floating-toolbar"
    :class="{ 'chart-drawing-floating-toolbar--moved': position !== null }"
    :style="position === null ? undefined : { left: `${position.left}px`, top: `${position.top}px` }"
    role="toolbar"
    :aria-label="t('marketData.chartDrawing.floatingToolbarLabel', { drawing: localize(drawing.kindLabel) })"
    data-testid="chart-drawing-floating-toolbar"
  >
    <button
      type="button"
      class="chart-drawing-floating-toolbar__grip"
      :aria-label="t('marketData.chartDrawing.moveToolbar')"
      @pointerdown.prevent="startDragging"
    >
      <AppIcon
        name="grip"
        size="small"
      />
    </button>

    <template v-if="drawing.styleEditable">
      <div class="chart-drawing-floating-toolbar__palette-anchor">
        <AppButton
          variant="chrome"
          size="small"
          :label="t('marketData.chartDrawing.lineColor')"
          :aria-expanded="paletteOpen"
          data-testid="drawing-line-color"
          @click="paletteOpen = !paletteOpen"
        >
          <span
            class="chart-drawing-floating-toolbar__swatch"
            :style="{ backgroundColor: `var(${drawing.colorToken})` }"
          />
        </AppButton>
        <div
          v-if="paletteOpen"
          class="chart-drawing-floating-toolbar__palette"
          role="listbox"
          :aria-label="t('marketData.chartDrawing.lineColor')"
        >
          <button
            v-for="color in CHART_DRAWING_COLORS"
            :key="color.token"
            type="button"
            role="option"
            class="chart-drawing-floating-toolbar__palette-color"
            :class="{ 'chart-drawing-floating-toolbar__palette-color--selected': color.token === drawing.colorToken }"
            :aria-selected="color.token === drawing.colorToken"
            :aria-label="localize(color.label)"
            :style="{ backgroundColor: `var(${color.token})` }"
            :data-testid="`drawing-color-${color.token}`"
            @click="changeColor(color.token)"
          />
        </div>
      </div>

      <AppButton
        variant="chrome"
        size="small"
        :label="t('marketData.chartDrawing.lineWidth', { width: drawing.lineWidth })"
        data-testid="drawing-line-width"
        @click="emit('command', new ChartDrawingCommandDto('cycleLineWidth'))"
      >
        {{ drawing.lineWidth }}px
      </AppButton>

      <AppButton
        variant="chrome"
        size="small"
        data-testid="drawing-line-style"
        @click="emit('command', new ChartDrawingCommandDto('cycleLineStyle'))"
      >
        {{ lineStyleLabels[drawing.lineStyle] }}
      </AppButton>
    </template>

    <AppButton
      variant="chrome"
      size="small"
      :label="drawing.locked ? t('marketData.chartDrawing.unlockDrawing') : t('marketData.chartDrawing.lockDrawing')"
      :aria-pressed="drawing.locked"
      data-testid="drawing-lock"
      @click="emit('command', new ChartDrawingCommandDto('toggleLocked'))"
    >
      <AppIcon
        :name="drawing.locked ? 'lock' : 'unlock'"
        stroke="fine"
      />
    </AppButton>

    <AppButton
      variant="chrome"
      size="small"
      :label="t('marketData.chartDrawing.removeDrawing')"
      data-testid="drawing-remove"
      @click="emit('remove')"
    >
      <AppIcon
        name="delete"
        stroke="fine"
      />
    </AppButton>
  </div>
</template>

<style scoped lang="scss">
.chart-drawing-floating-toolbar {
  position: absolute;
  z-index: 3;
  top: spacing('xs');
  left: 50%;
  display: flex;
  gap: spacing('3xs');
  align-items: center;
  box-shadow: shadow('md');
  border-radius: radius('sm');
  background-color: color('chart-workspace-popover');
  padding: spacing('3xs');
  transform: translateX(-50%);

  &--moved {
    transform: none;
  }

  &__grip {
    display: grid;
    place-items: center;
    border: 0;
    background: none;
    cursor: grab;
    padding: 0 spacing('3xs');
    color: color('chart-workspace-text-muted');
    touch-action: none;
  }

  &__palette-anchor {
    position: relative;
  }

  &__swatch {
    display: block;
    border: 1px solid color('chart-workspace-seam');
    border-radius: radius('xs');
    width: font-size('md');
    height: font-size('md');
  }

  &__palette {
    position: absolute;
    top: calc(100% + #{spacing('2xs')});
    left: 0;
    display: grid;
    grid-template-columns: repeat(6, auto);
    gap: spacing('2xs');
    box-shadow: shadow('md');
    border-radius: radius('sm');
    background-color: color('chart-workspace-popover');
    padding: spacing('xs');
  }

  &__palette-color {
    border: 0;
    border-radius: radius('xs');
    cursor: pointer;
    width: font-size('xl');
    height: font-size('xl');

    &--selected {
      outline: 2px solid color('chart-workspace-text');
      outline-offset: 1px;
    }
  }
}
</style>
