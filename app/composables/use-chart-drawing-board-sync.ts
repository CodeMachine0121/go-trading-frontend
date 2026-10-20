import type { Ref } from 'vue'
import type { ChartDrawingApplication } from '~/application/chart-drawing-application'
import type { ChartDrawingBoardDto } from '~/domain/models/dto/chart-drawing-board-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'
import { LocalizedError } from '~/domain/errors/localized-error'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

/** 做完一步之後等這麼久才存回；這段時間裡又做的步合併成一次。 */
export const CHART_DRAWING_SAVE_DELAY_MILLISECONDS = 800

/** 存回時連續這麼多次碰到帳號那一份又在別處改過，就停下來說明。 */
export const CHART_DRAWING_CONFLICT_RETRY_LIMIT = 3

/**
 * 繪圖板與帳號那一份之間的同步：什麼時候讀、什麼時候存、別處改過時接上、要對使用者說什麼。
 *
 * 規則（怎麼換編號、怎麼接上）在 Application 後面的 domain；這裡只管時機。
 * 讀、存、移除排成**一條佇列一次做一件**：讀與存同時在路上時，會把自己剛存的那一份誤當成別處的改動。
 */
export function useChartDrawingBoardSync(
  chartDrawingApplication: ChartDrawingApplication,
  marketSide: MarketSideVo,
  symbol: Ref<string>,
  refreshSignal: Ref<number>,
) {
  const { translatedText } = useLocalizedText()

  const board = shallowRef<ChartDrawingBoardDto>(chartDrawingApplication.openBoard(marketSide, symbol.value))
  const loadFailure = shallowRef<LocalizedTextVo | null>(null)
  const saveFailure = shallowRef<LocalizedTextVo | null>(null)
  const migrationFailure = shallowRef<LocalizedTextVo | null>(null)
  /** 一閃而過的提示（接上了別處的改動、搬了幾個舊繪圖、移除了幾個助手畫的）。 */
  const announcement = shallowRef<LocalizedTextVo | null>(null)

  let queue: Promise<void> = Promise.resolve()
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let loadWaiting = false

  function enqueue(task: () => Promise<void>): Promise<void> {
    queue = queue.then(task)

    return queue
  }

  function isShowing(candidate: ChartDrawingBoardDto): boolean {
    return candidate.marketSide === board.value.marketSide && candidate.symbol === board.value.symbol
  }

  function reasonOf(error: unknown): LocalizedTextVo {
    if (error instanceof LocalizedError) {
      return error.localizedMessage
    }

    return error instanceof Error
      ? new UntranslatedTextVo(error.message)
      : translatedText('marketData.chartDrawing.unexpectedFailure')
  }

  function withReason(key: string, reason: LocalizedTextVo): LocalizedTextVo {
    return translatedText(key, language => ({ reason: reason.in(language) }))
  }

  function scheduleSave(): void {
    if (saveTimer !== null) {
      clearTimeout(saveTimer)
    }
    saveTimer = setTimeout(() => {
      saveTimer = null
      void enqueue(() => save(board.value, 0))
    }, CHART_DRAWING_SAVE_DELAY_MILLISECONDS)
  }

  function scheduleSaveIfStillUnsaved(): void {
    if (board.value.hasUnsavedChanges && saveTimer === null) {
      scheduleSave()
    }
  }

  async function save(sentBoard: ChartDrawingBoardDto, conflictCount: number): Promise<void> {
    if (!sentBoard.hasUnsavedChanges) {
      return
    }

    try {
      const result = await chartDrawingApplication.saveBoard(sentBoard)
      if (!isShowing(sentBoard)) {
        return
      }

      if (result.outcome === 'saved') {
        board.value = chartDrawingApplication.acknowledgeSave(board.value, sentBoard, result.savedBoard)
        saveFailure.value = null
        scheduleSaveIfStillUnsaved()
        return
      }

      board.value = chartDrawingApplication.incorporateSavedBoard(board.value, result.savedBoard)
      announcement.value = translatedText('marketData.chartDrawing.boardChangedElsewhere')
      if (conflictCount + 1 >= CHART_DRAWING_CONFLICT_RETRY_LIMIT) {
        saveFailure.value = withReason('marketData.chartDrawing.boardSaveFailed',
          translatedText('marketData.chartDrawing.boardKeepsChangingElsewhere'))
        return
      }

      await save(board.value, conflictCount + 1)
    }
    catch (error: unknown) {
      if (isShowing(sentBoard)) {
        saveFailure.value = withReason('marketData.chartDrawing.boardSaveFailed', reasonOf(error))
      }
    }
  }

  async function load(): Promise<void> {
    loadWaiting = false
    const requestedBoard = board.value

    try {
      const loaded = await chartDrawingApplication.loadSavedBoard(requestedBoard.marketSide, requestedBoard.symbol)
      if (!isShowing(requestedBoard)) {
        return
      }

      loadFailure.value = null
      migrationFailure.value = loaded.migrationFailure === null
        ? null
        : withReason('marketData.chartDrawing.deviceDrawingsMigrationFailed', loaded.migrationFailure)
      board.value = chartDrawingApplication.incorporateSavedBoard(board.value, loaded.savedBoard)
      if (loaded.migratedDrawingCount > 0) {
        announcement.value = translatedText('marketData.chartDrawing.deviceDrawingsMigrated',
          { count: loaded.migratedDrawingCount })
      }
      scheduleSaveIfStillUnsaved()
    }
    catch (error: unknown) {
      if (isShowing(requestedBoard)) {
        loadFailure.value = withReason('marketData.chartDrawing.boardLoadFailed', reasonOf(error))
      }
    }
  }

  /** 重讀帳號那一份；已經排著一次還沒開始的就不再多排。 */
  function refresh(): Promise<void> {
    if (loadWaiting) {
      return queue
    }
    loadWaiting = true

    return enqueue(load)
  }

  /** 換上一份新的板子（使用者做了一步），稍後存回。 */
  function replaceBoard(nextBoard: ChartDrawingBoardDto): void {
    board.value = nextBoard
    scheduleSave()
  }

  function retrySave(): Promise<void> {
    if (saveTimer !== null) {
      clearTimeout(saveTimer)
      saveTimer = null
    }

    return enqueue(() => save(board.value, 0))
  }

  /** 移除帳號裡這一檔助手畫的全部，再重讀；不算一步。 */
  function removeAssistantDrawings(): Promise<void> {
    const requestedBoard = board.value

    return enqueue(async () => {
      try {
        const removedCount = await chartDrawingApplication.removeAssistantDrawings(
          requestedBoard.marketSide, requestedBoard.symbol)
        announcement.value = translatedText('marketData.chartDrawing.assistantDrawingsRemoved', { count: removedCount })
      }
      catch (error: unknown) {
        announcement.value = withReason('marketData.chartDrawing.assistantDrawingsRemovalFailed', reasonOf(error))
        return
      }

      await load()
    })
  }

  /** 換檔：還沒存的那幾步照樣送出，結果不再套到新的那一檔上。 */
  watch(symbol, (nextSymbol) => {
    const previousBoard = board.value
    if (saveTimer !== null) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    void enqueue(() => save(previousBoard, 0))

    board.value = chartDrawingApplication.openBoard(marketSide, nextSymbol)
    loadFailure.value = null
    saveFailure.value = null
    migrationFailure.value = null
    void refresh()
  })

  watch(refreshSignal, () => {
    void refresh()
  })

  function onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      void refresh()
    }
  }

  function onWindowFocus(): void {
    void refresh()
  }

  window.addEventListener('focus', onWindowFocus)
  document.addEventListener('visibilitychange', onVisibilityChange)

  onScopeDispose(() => {
    window.removeEventListener('focus', onWindowFocus)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    if (saveTimer !== null) {
      clearTimeout(saveTimer)
      saveTimer = null
      const leftBoard = board.value
      void enqueue(() => save(leftBoard, 0))
    }
  })

  void refresh()

  return {
    board,
    loadFailure,
    saveFailure,
    migrationFailure,
    announcement,
    replaceBoard,
    refresh,
    retrySave,
    removeAssistantDrawings,
  }
}
