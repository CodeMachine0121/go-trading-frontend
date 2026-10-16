<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Decimal from 'decimal.js'
import type { ChartDrawingApplication } from '~/application/chart-drawing-application'
import type { ChartDrawingAnchorDto } from '~/domain/models/dto/chart-drawing-anchor-dto'
import type { ChartDrawingDto } from '~/domain/models/dto/chart-drawing-dto'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { PlacedChartDrawingDto } from '~/domain/models/dto/placed-chart-drawing-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import { ChartDrawingCommandDto } from '~/domain/models/dto/chart-drawing-command-dto'
import { ChartDrawingAnchorVo } from '~/domain/models/vo/chart-drawing-anchor-vo'
import type { ChartCursorStyleValue } from '~/domain/models/vo/chart-cursor-style-vo'
import type { ChartDrawingKindValue } from '~/domain/models/vo/chart-drawing-kind-vo'
import type { ChartCoordinateSpace } from '~/utilities/chart-coordinate-space'

/**
 * 分子：疊在圖上的繪圖層。
 *
 * 它做兩件事：**把繪圖畫出來**（線、框、把手、軸上的標籤與色帶、最新價下面的收盤倒數），
 * 以及**把指標動作翻成繪圖的動作**（畫、選、拖）。
 *
 * 它不判斷任何業務規則：落點對到哪一根、磁鐵吸到哪個價、斐波那契各條在哪、量出來多少、
 * 鎖定的能不能動——一律問 Application。這裡只做像素與「第幾根＋多少價」之間的換算。
 *
 * 指標事件在**捕獲階段**就先攔下：點在繪圖上、或正在畫的時候，這一下屬於繪圖，
 * 圖本身不能跟著被拖走；其餘的放行，圖照常拖動與縮放。
 */
const {
  coordinateSpace,
  chart,
  chartDrawingApplication,
  drawings,
  selectedDrawingId = null,
  activeDrawingKind = null,
  cursorStyle = 'cross',
  magnet = false,
  lockAllDrawings = false,
  countdown = null,
  timeZone,
} = defineProps<{
  coordinateSpace: ChartCoordinateSpace
  chart: KCandleChartDto
  chartDrawingApplication: ChartDrawingApplication
  /** 要畫的那幾個（已經濾掉隱藏的）。 */
  drawings: readonly ChartDrawingDto[]
  selectedDrawingId?: number | null
  /** 正在用哪一種繪圖工具；`null` 是游標。 */
  activeDrawingKind?: ChartDrawingKindValue | null
  cursorStyle?: ChartCursorStyleValue
  magnet?: boolean
  lockAllDrawings?: boolean
  /** 最新那一根還有多久收完，寫在價格軸最新價的下面。 */
  countdown?: string | null
  timeZone: TimeZoneDto
}>()

const emit = defineEmits<{
  /** 畫完一個新的。 */
  finish: [drawing: ChartDrawingDto]
  select: [id: number | null]
  /** 拖動放手：那一個繪圖的錨點換成這幾個。 */
  change: [id: number, command: ChartDrawingCommandDto]
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()

/** 按下到放開移動不到這個距離算「點一下」。 */
const CLICK_DISTANCE_PIXELS = 5
/** 離一條線多近算點到它。 */
const HIT_TOLERANCE_PIXELS = 6
const HANDLE_RADIUS_PIXELS = 5
const AXIS_LABEL_HEIGHT_PIXELS = 20

const canvas = ref<HTMLCanvasElement | null>(null)

/** 正在畫的那一個：還在拖，或點了第一下、等第二下。 */
const draft = shallowRef<{ drawing: ChartDrawingDto, awaitingSecondPoint: boolean, startX: number, startY: number } | null>(null)
/** 正在拖的那一個：拖到哪就先畫在哪，放手才算一步。 */
const drag = shallowRef<{ original: ChartDrawingDto, preview: ChartDrawingDto, startX: number, startY: number, moved: boolean, reshape: (x: number, y: number) => ChartDrawingAnchorVo[] } | null>(null)
const hoveredDrawingId = ref<number | null>(null)
const pointer = ref<{ x: number, y: number } | null>(null)

/** 換了工具或回到游標時，畫到一半的那一個丟掉。 */
watch(() => activeDrawingKind, () => {
  draft.value = null
  coordinateSpace.setPanAndZoomEnabled(true)
})

/** 畫面上真正要畫的：拖動中的那一個換成預覽，正在畫的那一個加在最後。 */
const placedDrawings = computed<PlacedChartDrawingDto[]>(() => {
  const dragging = drag.value
  const shown = drawings.map(drawing => dragging !== null && drawing.id === dragging.original.id ? dragging.preview : drawing)

  return chartDrawingApplication.placeDrawings(
    chart, draft.value === null ? shown : [...shown, draft.value.drawing])
})

function alignedAnchorAt(x: number, y: number): ChartDrawingAnchorDto | null {
  const logicalIndex = coordinateSpace.xToLogical(x)
  const price = coordinateSpace.yToPrice(y)
  if (logicalIndex === null || price === null) {
    return null
  }

  return chartDrawingApplication.alignAnchor(chart, logicalIndex, new Decimal(price), magnet)
}

/** 錨點在畫面上的位置。 */
function pointOf(anchor: ChartDrawingAnchorDto): { x: number, y: number } {
  return {
    x: coordinateSpace.logicalToX(anchor.logicalIndex) ?? Number.NaN,
    y: coordinateSpace.priceToY(anchor.price.toNumber()) ?? Number.NaN,
  }
}

/** 一點到一段線的距離。 */
function distanceToSegment(x: number, y: number, from: { x: number, y: number }, to: { x: number, y: number }): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const lengthSquared = dx * dx + dy * dy
  const along = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - from.x) * dx + (y - from.y) * dy) / lengthSquared))

  return Math.hypot(x - (from.x + along * dx), y - (from.y + along * dy))
}

/** 射線從第一點穿過第二點，一直延伸到畫面外。 */
function rayEnd(from: { x: number, y: number }, through: { x: number, y: number }): { x: number, y: number } {
  const length = Math.hypot(through.x - from.x, through.y - from.y) || 1
  const reach = (coordinateSpace.plotWidth() + coordinateSpace.plotHeight()) * 2

  return { x: from.x + (through.x - from.x) / length * reach, y: from.y + (through.y - from.y) / length * reach }
}

function boundsOf(placed: PlacedChartDrawingDto) {
  const points = placed.anchors.map(pointOf)
  const xs = points.map(point => point.x)
  const ys = [...points.map(point => point.y), ...placed.fibonacciLevels.map(level => coordinateSpace.priceToY(level.price.toNumber()) ?? Number.NaN)]

  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) }
}

/** 每一種繪圖怎麼判斷「點到它了」。加一種繪圖就在這張表加一列。 */
const hitTesters: Record<ChartDrawingKindValue, (placed: PlacedChartDrawingDto, x: number, y: number) => boolean> = {
  trendLine: (placed, x, y) => {
    const [from, to] = placed.anchors.map(pointOf)
    return from !== undefined && to !== undefined && distanceToSegment(x, y, from, to) < HIT_TOLERANCE_PIXELS
  },
  ray: (placed, x, y) => {
    const [from, through] = placed.anchors.map(pointOf)
    return from !== undefined && through !== undefined && distanceToSegment(x, y, from, rayEnd(from, through)) < HIT_TOLERANCE_PIXELS
  },
  horizontalLine: (placed, _x, y) => Math.abs(y - pointOfFirst(placed).y) < HIT_TOLERANCE_PIXELS,
  horizontalRay: (placed, x, y) => Math.abs(y - pointOfFirst(placed).y) < HIT_TOLERANCE_PIXELS && x > pointOfFirst(placed).x - HIT_TOLERANCE_PIXELS,
  verticalLine: (placed, x) => Math.abs(x - pointOfFirst(placed).x) < HIT_TOLERANCE_PIXELS,
  fibonacciRetracement: (placed, x, y) => withinBounds(placed, x, y),
  rectangle: (placed, x, y) => withinBounds(placed, x, y),
  dateAndPriceRange: (placed, x, y) => withinBounds(placed, x, y),
}

function pointOfFirst(placed: PlacedChartDrawingDto): { x: number, y: number } {
  const first = placed.anchors[0]
  return first === undefined ? { x: Number.NaN, y: Number.NaN } : pointOf(first)
}

function withinBounds(placed: PlacedChartDrawingDto, x: number, y: number): boolean {
  const bounds = boundsOf(placed)
  return x > bounds.left - HIT_TOLERANCE_PIXELS && x < bounds.right + HIT_TOLERANCE_PIXELS
    && y > bounds.top - HIT_TOLERANCE_PIXELS && y < bounds.bottom + HIT_TOLERANCE_PIXELS
}

function topmostDrawingAt(x: number, y: number): PlacedChartDrawingDto | null {
  return [...placedDrawings.value].reverse().find(
    placed => placed.drawing.id !== 0 && hitTesters[placed.drawing.kind](placed, x, y)) ?? null
}

/**
 * 一個繪圖的把手：每一個在哪裡，以及拖它時錨點變成什麼。
 * 矩形另有另外兩個角與四邊的中點——拖一邊的中點只動那一邊。
 */
function handlesOf(placed: PlacedChartDrawingDto): { x: number, y: number, reshape: (moved: ChartDrawingAnchorVo) => ChartDrawingAnchorVo[] }[] {
  const anchors = placed.anchors.map(anchor => anchor.toVo())
  const [first, second] = anchors
  const points = placed.anchors.map(pointOf)
  const [firstPoint, secondPoint] = points
  const endpoints = points.map((point, index) => ({
    ...point,
    reshape: (moved: ChartDrawingAnchorVo) => anchors.map((anchor, anchorIndex) => anchorIndex === index ? moved : anchor),
  }))
  if (placed.drawing.kind !== 'rectangle' || first === undefined || second === undefined
    || firstPoint === undefined || secondPoint === undefined) {
    return endpoints
  }

  const middleX = (firstPoint.x + secondPoint.x) / 2
  const middleY = (firstPoint.y + secondPoint.y) / 2
  const anchorOf = (openTime: Date, price: Decimal) => new ChartDrawingAnchorVo(openTime, price)

  return [
    ...endpoints,
    { x: firstPoint.x, y: secondPoint.y, reshape: moved => [anchorOf(moved.openTime, first.price), anchorOf(second.openTime, moved.price)] },
    { x: secondPoint.x, y: firstPoint.y, reshape: moved => [anchorOf(first.openTime, moved.price), anchorOf(moved.openTime, second.price)] },
    { x: firstPoint.x, y: middleY, reshape: moved => [anchorOf(moved.openTime, first.price), second] },
    { x: secondPoint.x, y: middleY, reshape: moved => [first, anchorOf(moved.openTime, second.price)] },
    { x: middleX, y: firstPoint.y, reshape: moved => [anchorOf(first.openTime, moved.price), second] },
    { x: middleX, y: secondPoint.y, reshape: moved => [first, anchorOf(second.openTime, moved.price)] },
  ]
}

function localPoint(event: PointerEvent): { x: number, y: number } {
  const bounds = canvas.value?.getBoundingClientRect()
  return { x: event.clientX - (bounds?.left ?? 0), y: event.clientY - (bounds?.top ?? 0) }
}

const insidePlot = (x: number, y: number) => x >= 0 && y >= 0 && x < coordinateSpace.plotWidth() && y < coordinateSpace.plotHeight()

/** 攔下這一下：它屬於繪圖，圖本身不能跟著動。 */
function claim(event: PointerEvent) {
  event.stopPropagation()
  event.preventDefault()
  coordinateSpace.setPanAndZoomEnabled(false)
}

function onPointerDown(event: PointerEvent) {
  const { x, y } = localPoint(event)
  if (event.button !== 0 || !insidePlot(x, y)) {
    return
  }

  const kind = activeDrawingKind
  if (kind !== null) {
    claim(event)
    const anchor = alignedAnchorAt(x, y)
    if (anchor === null) {
      return
    }

    const pending = draft.value
    if (pending !== null && pending.awaitingSecondPoint) {
      finishDraft(pending.drawing, anchor.toVo())
      return
    }

    // 一個點就畫得完的那幾種（水平線、水平射線、垂直線）點一下就好——
    // 要幾個點由繪圖目錄說，這裡只看它收下了幾個。
    const drafted = chartDrawingApplication.draftDrawing(kind, [anchor.toVo(), anchor.toVo()])
    if (drafted.anchors.length === 1) {
      emit('finish', drafted)
      coordinateSpace.setPanAndZoomEnabled(true)
      return
    }

    draft.value = {
      drawing: drafted,
      awaitingSecondPoint: false,
      startX: x,
      startY: y,
    }
    return
  }

  const selected = placedDrawings.value.find(placed => placed.drawing.id === selectedDrawingId)
  const movable = (drawing: ChartDrawingDto) => !drawing.locked && !lockAllDrawings
  const handle = selected !== undefined && movable(selected.drawing)
    ? handlesOf(selected).find(candidate => Math.hypot(candidate.x - x, candidate.y - y) < HANDLE_RADIUS_PIXELS + 3)
    : undefined
  if (selected !== undefined && handle !== undefined) {
    claim(event)
    drag.value = {
      original: selected.drawing,
      preview: selected.drawing,
      startX: x,
      startY: y,
      moved: false,
      reshape: (movedX, movedY) => {
        const moved = alignedAnchorAt(movedX, movedY)
        return moved === null ? selected.drawing.anchors.slice() : handle.reshape(moved.toVo())
      },
    }
    return
  }

  const hit = topmostDrawingAt(x, y)
  if (hit === null) {
    if (selectedDrawingId !== null) {
      emit('select', null)
    }
    return
  }

  claim(event)
  emit('select', hit.drawing.id)
  if (!movable(hit.drawing)) {
    return
  }

  drag.value = {
    original: hit.drawing,
    preview: hit.drawing,
    startX: x,
    startY: y,
    moved: false,
    // 整個移動：每一個錨點平移同樣的根數、在畫面上平移同樣的距離（對數刻度下也對）。
    reshape: (movedX, movedY) => {
      const startLogical = coordinateSpace.xToLogical(x) ?? 0
      const shift = Math.round((coordinateSpace.xToLogical(movedX) ?? startLogical) - startLogical)

      return hit.anchors.map((anchor) => {
        const shiftedY = (coordinateSpace.priceToY(anchor.price.toNumber()) ?? 0) + movedY - y
        const shiftedPrice = coordinateSpace.yToPrice(shiftedY) ?? anchor.price.toNumber()

        return chartDrawingApplication.alignAnchor(chart, anchor.logicalIndex + shift, new Decimal(shiftedPrice), false).toVo()
      })
    },
  }
}

function finishDraft(drawing: ChartDrawingDto, secondAnchor: ChartDrawingAnchorVo) {
  const [firstAnchor] = drawing.anchors
  draft.value = null
  coordinateSpace.setPanAndZoomEnabled(true)
  if (firstAnchor !== undefined) {
    emit('finish', chartDrawingApplication.previewChange(drawing,
      new ChartDrawingCommandDto('replaceAnchors', [firstAnchor, secondAnchor])))
  }
}

function onPointerMove(event: PointerEvent) {
  const { x, y } = localPoint(event)
  pointer.value = insidePlot(x, y) ? { x, y } : null

  const pending = draft.value
  if (pending !== null) {
    const [firstAnchor] = pending.drawing.anchors
    const anchor = alignedAnchorAt(x, y)
    if (firstAnchor !== undefined && anchor !== null) {
      draft.value = { ...pending, drawing: chartDrawingApplication.previewChange(pending.drawing,
        new ChartDrawingCommandDto('replaceAnchors', [firstAnchor, anchor.toVo()])) }
    }
    return
  }

  const dragging = drag.value
  if (dragging !== null) {
    const preview = chartDrawingApplication.previewChange(dragging.original,
      new ChartDrawingCommandDto('replaceAnchors', dragging.reshape(x, y)))
    drag.value = { ...dragging, preview, moved: dragging.moved || x !== dragging.startX || y !== dragging.startY }
    return
  }

  hoveredDrawingId.value = activeDrawingKind === null && insidePlot(x, y) ? topmostDrawingAt(x, y)?.drawing.id ?? null : null
}

function onPointerUp(event: PointerEvent) {
  const pending = draft.value
  if (pending !== null && !pending.awaitingSecondPoint) {
    const { x, y } = localPoint(event)
    const [, secondAnchor] = pending.drawing.anchors
    if (Math.hypot(x - pending.startX, y - pending.startY) > CLICK_DISTANCE_PIXELS && secondAnchor !== undefined) {
      finishDraft(pending.drawing, secondAnchor)
    }
    else {
      // 點一下、移動、再點一下——與 TradingView 一樣兩種畫法都行。
      draft.value = { ...pending, awaitingSecondPoint: true }
    }
    return
  }

  const dragging = drag.value
  if (dragging !== null) {
    drag.value = null
    coordinateSpace.setPanAndZoomEnabled(true)
    // 指標真的動過才交出去：點一下沒拖，只是選取。動了一點點卻對齊回原處的，由領域判斷那不算一步。
    if (dragging.moved) {
      emit('change', dragging.original.id, new ChartDrawingCommandDto('replaceAnchors', dragging.preview.anchors))
    }
  }
}

function onPointerLeave() {
  pointer.value = null
  hoveredDrawingId.value = null
}

/* ── 畫 ── */

let animationFrame = 0
let paintedSignature = ''
let needsPaint = true

watch([placedDrawings, () => selectedDrawingId, hoveredDrawingId, pointer, () => countdown, () => cursorStyle], () => {
  needsPaint = true
})

function colorOf(token: string): string {
  const root = canvas.value
  return root === null ? token : getComputedStyle(root).getPropertyValue(token).trim() || token
}

/** 把一個顏色加上透明度。顏色一律是 token 解出來的 #rrggbb。 */
function withAlpha(color: string, alpha: number): string {
  const hex = color.replace('#', '')
  if (hex.length !== 6) {
    return color
  }
  const value = Number.parseInt(hex, 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

function paintLoop() {
  animationFrame = requestAnimationFrame(paintLoop)
  const signature = coordinateSpace.signature()
  if (!needsPaint && signature === paintedSignature) {
    return
  }

  needsPaint = false
  paintedSignature = signature
  paint()
}

function setLineStyle(context: CanvasRenderingContext2D, drawing: ChartDrawingDto) {
  const width = drawing.lineWidth
  context.lineWidth = width
  context.setLineDash(drawing.lineStyle === 'dashed' ? [6 * width, 4 * width] : drawing.lineStyle === 'dotted' ? [width, 2.5 * width] : [])
}

/** 每一種繪圖怎麼畫。加一種繪圖就在這張表加一列。 */
const painters: Record<ChartDrawingKindValue, (context: CanvasRenderingContext2D, placed: PlacedChartDrawingDto) => void> = {
  trendLine: (context, placed) => {
    const [from, to] = placed.anchors.map(pointOf)
    if (from !== undefined && to !== undefined) {
      strokeLine(context, from, to)
    }
  },
  ray: (context, placed) => {
    const [from, through] = placed.anchors.map(pointOf)
    if (from !== undefined && through !== undefined) {
      strokeLine(context, from, rayEnd(from, through))
    }
  },
  horizontalLine: (context, placed) => {
    const { y } = pointOfFirst(placed)
    strokeLine(context, { x: 0, y }, { x: coordinateSpace.plotWidth(), y })
  },
  horizontalRay: (context, placed) => {
    const point = pointOfFirst(placed)
    strokeLine(context, point, { x: coordinateSpace.plotWidth(), y: point.y })
  },
  verticalLine: (context, placed) => {
    const { x } = pointOfFirst(placed)
    strokeLine(context, { x, y: 0 }, { x, y: coordinateSpace.plotHeight() })
  },
  rectangle: (context, placed) => {
    const bounds = boundsOf(placed)
    context.fillStyle = withAlpha(colorOf(placed.drawing.colorToken), 0.2)
    context.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top)
    context.strokeRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top)
  },
  fibonacciRetracement: (context, placed) => {
    const bounds = boundsOf(placed)
    const levels = placed.fibonacciLevels.map(level => ({ ...level, y: coordinateSpace.priceToY(level.price.toNumber()) ?? Number.NaN }))
    levels.slice(1).forEach((level, index) => {
      const previous = levels[index]
      if (previous !== undefined) {
        context.fillStyle = withAlpha(colorOf(level.colorToken), 0.12)
        context.fillRect(bounds.left, Math.min(previous.y, level.y), bounds.right - bounds.left, Math.abs(level.y - previous.y))
      }
    })
    context.setLineDash([])
    context.lineWidth = 1
    context.textAlign = 'right'
    for (const level of levels) {
      const color = colorOf(level.colorToken)
      context.strokeStyle = color
      strokeLine(context, { x: bounds.left, y: level.y }, { x: bounds.right, y: level.y })
      context.fillStyle = color
      context.fillText(`${level.ratio}(${coordinateSpace.formatPrice(level.price.toNumber())})`, bounds.left - 6, level.y)
    }
    const [from, to] = placed.anchors.map(pointOf)
    if (from !== undefined && to !== undefined) {
      context.strokeStyle = colorOf('--color-drawing-gray')
      context.setLineDash([4, 4])
      strokeLine(context, from, to)
    }
  },
  dateAndPriceRange: (context, placed) => {
    const measurement = placed.measurement
    const [from, to] = placed.anchors.map(pointOf)
    if (measurement === null || from === undefined || to === undefined) {
      return
    }

    const bounds = boundsOf(placed)
    const color = colorOf(measurement.rising ? '--color-drawing-blue' : '--color-drawing-red')
    context.setLineDash([])
    context.lineWidth = 1
    context.strokeStyle = color
    context.fillStyle = withAlpha(color, 0.18)
    context.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top)
    const middleX = (bounds.left + bounds.right) / 2
    const middleY = (bounds.top + bounds.bottom) / 2
    strokeLine(context, { x: middleX, y: from.y }, { x: middleX, y: to.y })
    strokeLine(context, { x: from.x, y: middleY }, { x: to.x, y: middleY })
    const verticalTip = measurement.rising ? -1 : 1
    strokeLine(context, { x: middleX - 5, y: to.y - verticalTip * 5 }, { x: middleX, y: to.y })
    strokeLine(context, { x: middleX + 5, y: to.y - verticalTip * 5 }, { x: middleX, y: to.y })
    const horizontalTip = to.x >= from.x ? 1 : -1
    strokeLine(context, { x: to.x - horizontalTip * 5, y: middleY - 5 }, { x: to.x, y: middleY })
    strokeLine(context, { x: to.x - horizontalTip * 5, y: middleY + 5 }, { x: to.x, y: middleY })

    const sign = measurement.priceDifference.isNegative() ? '−' : ''
    const lines = [
      `${sign}${coordinateSpace.formatPrice(measurement.priceDifference.abs().toNumber())}${measurement.percentText === null ? '' : ` (${measurement.percentText.replace('-', '−')}%)`}`,
      t('marketData.chartDrawing.rangeKCandleCount', { count: measurement.kCandleCount, duration: localize(measurement.duration) }),
      t('marketData.chartDrawing.rangeVolume', { volume: measurement.volume.toDecimalPlaces(2).toString() }),
    ]
    const lineHeight = 17
    const boxWidth = Math.max(...lines.map(line => context.measureText(line).width)) + 20
    const boxHeight = lines.length * lineHeight + 10
    const boxTop = measurement.rising ? bounds.top - boxHeight - 6 : bounds.bottom + 6
    context.fillStyle = color
    context.beginPath()
    context.roundRect(middleX - boxWidth / 2, boxTop, boxWidth, boxHeight, 4)
    context.fill()
    context.fillStyle = colorOf('--color-chart-workspace-on-accent')
    context.textAlign = 'center'
    lines.forEach((line, index) => context.fillText(line, middleX, boxTop + 13 + index * lineHeight))
  },
}

function strokeLine(context: CanvasRenderingContext2D, from: { x: number, y: number }, to: { x: number, y: number }) {
  context.beginPath()
  context.moveTo(from.x, from.y)
  context.lineTo(to.x, to.y)
  context.stroke()
}

/** 軸上的一枚標籤：價格軸那邊寫價、時間軸那邊寫時間。 */
function axisLabel(context: CanvasRenderingContext2D, text: string, color: string, at: { x?: number, y?: number }) {
  context.font = labelFont
  context.textAlign = 'left'
  const plotWidth = coordinateSpace.plotWidth()
  const plotHeight = coordinateSpace.plotHeight()
  if (at.y !== undefined) {
    context.fillStyle = color
    context.fillRect(plotWidth, at.y - AXIS_LABEL_HEIGHT_PIXELS / 2, coordinateSpace.priceAxisWidth(), AXIS_LABEL_HEIGHT_PIXELS)
    context.fillStyle = colorOf('--color-chart-workspace-on-accent')
    context.fillText(text, plotWidth + 6, at.y)
    return
  }

  const width = context.measureText(text).width + 16
  const left = Math.max(0, Math.min(plotWidth - width, (at.x ?? 0) - width / 2))
  context.fillStyle = color
  context.fillRect(left, plotHeight, width, coordinateSpace.timeAxisHeight())
  context.fillStyle = colorOf('--color-chart-workspace-on-accent')
  context.fillText(text, left + 8, plotHeight + coordinateSpace.timeAxisHeight() / 2)
}

let labelFont = '11px sans-serif'

function paint() {
  const element = canvas.value
  const context = element?.getContext('2d') ?? null
  if (element === null || context === null) {
    return
  }

  const ratio = window.devicePixelRatio || 1
  const { width, height } = element.getBoundingClientRect()
  if (element.width !== Math.round(width * ratio) || element.height !== Math.round(height * ratio)) {
    element.width = Math.round(width * ratio)
    element.height = Math.round(height * ratio)
  }
  const style = getComputedStyle(element)
  labelFont = `${style.fontSize} ${style.fontFamily}`
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, width, height)
  context.font = labelFont
  context.textBaseline = 'middle'

  const plotWidth = coordinateSpace.plotWidth()
  const plotHeight = coordinateSpace.plotHeight()
  const selected = placedDrawings.value.find(placed => placed.drawing.id === selectedDrawingId || placed.drawing.id === 0) ?? null

  context.save()
  context.beginPath()
  context.rect(0, 0, plotWidth, plotHeight)
  context.clip()
  for (const placed of placedDrawings.value) {
    context.strokeStyle = colorOf(placed.drawing.colorToken)
    setLineStyle(context, placed.drawing)
    painters[placed.drawing.kind](context, placed)
    context.setLineDash([])

    if (placed === selected || placed.drawing.id === hoveredDrawingId.value) {
      for (const handle of handlesOf(placed)) {
        context.beginPath()
        context.arc(handle.x, handle.y, placed === selected ? HANDLE_RADIUS_PIXELS : HANDLE_RADIUS_PIXELS - 1, 0, Math.PI * 2)
        context.fillStyle = colorOf('--color-chart-workspace-surface')
        context.fill()
        context.lineWidth = 1.5
        context.strokeStyle = colorOf(placed.drawing.styleEditable ? placed.drawing.colorToken : '--color-chart-workspace-accent')
        context.stroke()
      }
    }
  }
  if (cursorStyle === 'dot' && activeDrawingKind === null && pointer.value !== null) {
    context.beginPath()
    context.arc(pointer.value.x, pointer.value.y, 2.5, 0, Math.PI * 2)
    context.fillStyle = colorOf('--color-chart-workspace-crosshair')
    context.fill()
  }
  context.restore()

  // 最新價下面的收盤倒數，接在函式庫自己的那枚最新價標籤正下方、同一個顏色。
  const latest = chart.latestKCandle
  const latestY = latest === null ? null : coordinateSpace.priceToY(latest.close.toNumber())
  if (latest !== null && latestY !== null && countdown !== null) {
    const toneToken = latest.trend.tone === 'danger' ? '--color-chart-workspace-down' : '--color-chart-workspace-up'
    axisLabel(context, countdown, colorOf(toneToken), { y: latestY + AXIS_LABEL_HEIGHT_PIXELS - 2 })
  }

  // 水平線與水平射線在價格軸上常駐價格；垂直線在時間軸上常駐時間。
  for (const placed of placedDrawings.value) {
    const color = colorOf(placed.drawing.colorToken)
    const [anchor] = placed.anchors
    if (anchor === undefined) {
      continue
    }
    if (placed.drawing.kind === 'horizontalLine' || placed.drawing.kind === 'horizontalRay') {
      axisLabel(context, coordinateSpace.formatPrice(anchor.price.toNumber()), color, { y: pointOf(anchor).y })
    }
    if (placed.drawing.kind === 'verticalLine') {
      axisLabel(context, timeZone.formatDateTime(anchor.openTime), color, { x: pointOf(anchor).x })
    }
  }

  // 選取中的那一個：兩條軸上用色帶標出它涵蓋的範圍，並寫出每個錨點的價與時間。
  if (selected !== null && selected.anchors.length === 2) {
    const accent = colorOf('--color-chart-workspace-accent')
    const color = colorOf(selected.drawing.styleEditable ? selected.drawing.colorToken : '--color-chart-workspace-accent')
    const points = selected.anchors.map(pointOf)
    const ys = points.map(point => point.y)
    const xs = points.map(point => point.x)
    context.fillStyle = withAlpha(accent, 0.22)
    context.fillRect(plotWidth, Math.min(...ys), coordinateSpace.priceAxisWidth(), Math.abs((ys[0] ?? 0) - (ys[1] ?? 0)))
    context.fillRect(Math.min(...xs), plotHeight, Math.abs((xs[0] ?? 0) - (xs[1] ?? 0)), coordinateSpace.timeAxisHeight())
    selected.anchors.forEach((anchor, index) => {
      const point = points[index]
      if (point !== undefined) {
        axisLabel(context, coordinateSpace.formatPrice(anchor.price.toNumber()), color, { y: point.y })
        axisLabel(context, timeZone.formatDateTime(anchor.openTime), color, { x: point.x })
      }
    })
  }
}

onMounted(() => {
  const root = canvas.value?.parentElement
  root?.addEventListener('pointerdown', onPointerDown, { capture: true })
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  root?.addEventListener('pointerleave', onPointerLeave)
  animationFrame = requestAnimationFrame(paintLoop)
})

onBeforeUnmount(() => {
  const root = canvas.value?.parentElement
  root?.removeEventListener('pointerdown', onPointerDown, { capture: true })
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  root?.removeEventListener('pointerleave', onPointerLeave)
  cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <canvas
    ref="canvas"
    class="chart-drawing-layer"
    :class="{ 'chart-drawing-layer--drawing': activeDrawingKind !== null }"
    data-testid="chart-drawing-layer"
  />
</template>

<style scoped lang="scss">
.chart-drawing-layer {
  position: absolute;
  z-index: 1;
  inset: 0;
  width: 100%;
  height: 100%;

  // 畫布本身不收指標事件：事件由它的父層在捕獲階段判斷要不要攔，攔不下的照常落到圖上。
  pointer-events: none;
  font-size: font-size('2xs');
}
</style>
