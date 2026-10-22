import type { Ref } from 'vue'
import type { ChartDrawingApplication } from '~/application/chart-drawing-application'
import type { ChartDrawingCommandDto } from '~/domain/models/dto/chart-drawing-command-dto'
import type { ChartDrawingDto } from '~/domain/models/dto/chart-drawing-dto'
import type { ChartDrawingToolGroupDto } from '~/domain/models/dto/chart-drawing-tool-group-dto'
import { ChartDrawingBoardAnchorCapacityError } from '~/domain/errors/chart-drawing-board-anchor-capacity-error'
import { CHART_CURSOR_STYLES, type ChartCursorStyleValue } from '~/domain/models/vo/chart-cursor-style-vo'
import type { ChartDrawingKindValue } from '~/domain/models/vo/chart-drawing-kind-vo'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'

type ToolValue = ChartCursorStyleValue | ChartDrawingKindValue

/**
 * 圖上繪圖這一塊的**畫面狀態**：這一檔的繪圖板、選了哪個工具、選取了哪一個、四個開關。
 *
 * 它不做任何業務判斷——一個繪圖能不能改、上一步回到哪、落點對到哪一根，一律問 Application。
 * 它持有的是「現在畫面上是什麼樣子」，不是規則。
 *
 * 換交易標的時整塊重來：帶出那一檔的繪圖、上一步的紀錄從頭開始、什麼都不選取。
 * 板子與帳號那一份的同步交給 `useChartDrawingBoardSync`：每一步換上新的板子，它稍後存回。
 */
export function useChartDrawings(
  chartDrawingApplication: ChartDrawingApplication,
  marketSide: MarketSideVo,
  symbol: Ref<string>,
  boardRefreshSignal: Ref<number> = ref(0),
) {
  const boardSync = useChartDrawingBoardSync(chartDrawingApplication, marketSide, symbol, boardRefreshSignal)
  const { board, replaceBoard } = boardSync
  const toolGroups: readonly ChartDrawingToolGroupDto[] = chartDrawingApplication.listToolGroups()

  /** 每一格記得上次用的是哪一個；一開始是那一格的第一個。 */
  const rememberedTools = ref<Record<string, ToolValue>>(Object.fromEntries(
    toolGroups.flatMap(group => group.tools[0] === undefined ? [] : [[group.value, group.tools[0].value]])))

  /** 正在用哪一種繪圖工具；`null` 是游標。 */
  const activeDrawingKind = ref<ChartDrawingKindValue | null>(null)
  const cursorStyle = ref<ChartCursorStyleValue>('cross')
  const magnet = ref(false)
  const stayInDrawingMode = ref(false)
  const lockAllDrawings = ref(false)
  const hideAllDrawings = ref(false)
  const selectedDrawingId = ref<number | null>(null)

  watch(symbol, () => {
    selectedDrawingId.value = null
  })

  /** 存回之後新繪圖換成帳號發的編號，選取跟著換。 */
  watch(board, (nextBoard) => {
    const renumberedId = selectedDrawingId.value === null
      ? undefined
      : nextBoard.renumberedDrawingIds.get(selectedDrawingId.value)
    if (renumberedId !== undefined) {
      selectedDrawingId.value = renumberedId
    }
  })

  /** 要畫在圖上的那幾個：隱藏所有時一個都沒有，自己收起來的也不在。 */
  const shownDrawings = computed<readonly ChartDrawingDto[]>(() => hideAllDrawings.value
    ? []
    : board.value.drawings.filter(drawing => drawing.visible))

  /** 選取中的那一個；它被隱藏、被刪掉或整個隱藏時就沒有選取。 */
  const selectedDrawing = computed(() => shownDrawings.value.find(
    drawing => drawing.id === selectedDrawingId.value) ?? null)

  /** 選一個工具：游標樣式就回到游標，繪圖工具就開始畫；那一格記住它。 */
  function pickTool(value: ToolValue) {
    const group = toolGroups.find(candidate => candidate.tools.some(tool => tool.value === value))
    if (group === undefined) {
      return
    }

    rememberedTools.value = { ...rememberedTools.value, [group.value]: value }
    const pickedCursorStyle = CHART_CURSOR_STYLES.find(style => style.value === value)
    if (pickedCursorStyle !== undefined) {
      cursorStyle.value = pickedCursorStyle.value
      activeDrawingKind.value = null
      return
    }

    activeDrawingKind.value = value as ChartDrawingKindValue
    selectedDrawingId.value = null
  }

  /** 按一格的主按鈕：用那一格記得的工具；那個工具正在用時，再按一次回到游標。 */
  function pressToolGroup(groupValue: ChartDrawingToolGroupDto['value']) {
    const remembered = rememberedTools.value[groupValue]
    if (remembered === undefined) {
      return
    }

    if (remembered === activeDrawingKind.value) {
      activeDrawingKind.value = null
      return
    }

    pickTool(remembered)
  }

  /** 按著 ⌥ 按下的那一個鍵對到一種繪圖時換成它；對到了才回 `true`。 */
  function pickToolByShortcut(keyCode: string, withShift: boolean): boolean {
    const kind = chartDrawingApplication.drawingKindForShortcut(keyCode, withShift)
    if (kind === null) {
      return false
    }

    pickTool(kind)
    return true
  }

  /** 回到游標、什麼都不選取。Esc 做的就是這件事。 */
  function returnToCursor() {
    activeDrawingKind.value = null
    selectedDrawingId.value = null
  }

  /**
   * 畫完一個：收進板子、選取它；沒開連續繪圖時回到游標。
   * 加上它會超過繪圖點數上限時不收，說明原因，板子與工具都不動。
   */
  function finishDrawing(drawing: ChartDrawingDto) {
    try {
      replaceBoard(chartDrawingApplication.addDrawing(board.value, drawing))
    }
    catch (error: unknown) {
      if (!(error instanceof ChartDrawingBoardAnchorCapacityError)) {
        throw error
      }
      boardSync.announcement.value = error.localizedMessage
      return
    }
    selectedDrawingId.value = board.value.drawings.at(-1)?.id ?? null
    if (!stayInDrawingMode.value) {
      activeDrawingKind.value = null
    }
  }

  function selectDrawing(id: number | null) {
    selectedDrawingId.value = id
  }

  function changeDrawing(id: number, command: ChartDrawingCommandDto) {
    replaceBoard(chartDrawingApplication.changeDrawing(board.value, id, command))
  }

  function removeDrawing(id: number) {
    replaceBoard(chartDrawingApplication.removeDrawing(board.value, id))
  }

  /** 移除所有；交回移除了幾個——零個時什麼都沒變，畫面據此說不同的話。 */
  function removeAllDrawings(): number {
    const removedCount = board.value.drawings.length
    replaceBoard(chartDrawingApplication.removeAllDrawings(board.value))
    selectedDrawingId.value = null

    return removedCount
  }

  function undo() {
    replaceBoard(chartDrawingApplication.undo(board.value))
  }

  function redo() {
    replaceBoard(chartDrawingApplication.redo(board.value))
  }

  return {
    board,
    loadFailure: boardSync.loadFailure,
    saveFailure: boardSync.saveFailure,
    migrationFailure: boardSync.migrationFailure,
    announcement: boardSync.announcement,
    reloadBoard: boardSync.refresh,
    retrySave: boardSync.retrySave,
    removeAssistantDrawings: boardSync.removeAssistantDrawings,
    toolGroups,
    rememberedTools,
    activeDrawingKind,
    cursorStyle,
    magnet,
    stayInDrawingMode,
    lockAllDrawings,
    hideAllDrawings,
    shownDrawings,
    selectedDrawing,
    pickTool,
    pressToolGroup,
    pickToolByShortcut,
    returnToCursor,
    finishDrawing,
    selectDrawing,
    changeDrawing,
    removeDrawing,
    removeAllDrawings,
    undo,
    redo,
  }
}
