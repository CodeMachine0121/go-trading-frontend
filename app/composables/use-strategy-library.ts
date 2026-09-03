import type { StrategyApplication } from '~/application/strategy-application'
import type { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'
import type { StrategyDto } from '~/domain/models/dto/strategy-dto'
import { StrategyWriteDto } from '~/domain/models/dto/strategy-write-dto'
import { StrategyFieldError } from '~/domain/errors/strategy-field-error'
import { StrategyNameConflictError } from '~/domain/errors/strategy-name-conflict-error'
import { StrategyNotFoundError } from '~/domain/errors/strategy-not-found-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

/** 目前哪一個對話框疊在畫面上。一次只有一個——好幾個同時開沒有任何意義。 */
type OpenDialog = 'none' | 'library' | 'name' | 'rename' | 'discard' | 'delete'

/**
 * 策略在指標計算這個畫面上的**狀態**：留著哪些、正在用哪一支、載入當下那一份長什麼樣、
 * 哪個對話框開著、哪件事正在進行。
 *
 * **它不做任何業務判斷**——「有沒有改過」「這次算新增還是更新」一律問 Application。
 * 它持有的是狀態，不是規則。把這些從面板搬出來，是因為面板該剩下的只有
 * 「使用者按了什麼」與「畫面怎麼呈現結果」。
 */
export function useStrategyLibrary(
  strategyApplication: StrategyApplication,
  readCurrentContent: () => StrategyContentDto,
  applyContent: (content: StrategyContentDto) => void,
  /** 一份空白的策略內容。「空白長什麼樣」由畫面定義，這裡只負責在對的時機套用它。 */
  blankContent: StrategyContentDto,
) {
  const strategies = ref<StrategyDto[]>([])
  const activeStrategy = ref<StrategyDto | null>(null)
  /** 載入當下那一份。跟現在畫面上的比，就知道有沒有東西還沒存。 */
  const loadedContent = ref<StrategyContentDto | null>(null)

  const openDialog = ref<OpenDialog>('none')
  const saving = ref(false)
  const listErrorMessage = ref<string | null>(null)
  const nameErrorMessage = ref<string | null>(null)
  const noticeMessage = ref<string | null>(null)
  const errorMessage = ref<string | null>(null)

  /** 被確認擋下來的「要刪哪一支」。使用者說「好」之後才真的刪。 */
  const pendingStrategyId = ref<number | null>(null)

  /**
   * 被確認擋下來的「會蓋掉編輯區的那件事」。
   *
   * 存的是**待執行的動作**而不是一個識別碼，因為會蓋掉編輯區的動作不只一種：
   * 載入某一支有識別碼，開一份空白沒有。存動作的話，確認之後只要把它叫出來，
   * 不必知道那是哪一種——之後再多一個這類動作也不必回頭改這裡。
   */
  const pendingDraftAction = shallowRef<(() => void) | null>(null)

  async function refreshStrategies() {
    listErrorMessage.value = null

    try {
      strategies.value = await strategyApplication.listStrategies()
    }
    catch (error: unknown) {
      // 取不到清單時**不清空手上這一份**——把它清空等於告訴使用者他什麼都沒存過。
      listErrorMessage.value = messageOf(error, '取得策略清單時發生未預期的錯誤。')
    }
  }

  function openLibrary() {
    openDialog.value = 'library'
    void refreshStrategies()
  }

  function closeDialog() {
    openDialog.value = 'none'
    nameErrorMessage.value = null
    pendingStrategyId.value = null
    pendingDraftAction.value = null
  }

  /** 挑一支來用。 */
  function selectStrategy(id: number) {
    guardOverwritingDraft(() => loadStrategy(id))
  }

  /**
   * 開一份新的空白——編輯器裡的「開新檔案」。
   *
   * 它**到不了應用程式邊界**：沒有請求、沒有 await，純粹是把畫面上這一份稿子換成一份空白，
   * 並解除它與任何一支策略的關聯。因此接著按儲存就是問名字、另存為新的一支，
   * 不會蓋掉剛才在用的那一支。
   *
   * `loadedContent` 設成 null 而不是那份空白，因為「沒有載入過任何策略」就是實話；
   * 而既有的「還沒載入過時只看算式是不是空白」那條規則剛好正是我們要的行為——
   * 一個字都還沒打就再按一次，不必再問一遍。
   */
  function startBlankStrategy() {
    guardOverwritingDraft(applyBlankContent)
  }

  function applyBlankContent() {
    applyContent(blankContent)
    activeStrategy.value = null
    loadedContent.value = null
    openDialog.value = 'none'
    clearMessages()
    // 編輯區本來就空的時候，少了這一句，那顆按鈕看起來像壞了。
    noticeMessage.value = '已經開了一份新的空白策略。'
  }

  /**
   * 這件事會蓋掉編輯區，所以有還沒存的東西時先問過——
   * 其他事情做錯了可以重來，弄丟寫到一半的算式沒得重來。
   *
   * 「載入另一支」與「開一份空白」共用它：兩者都會蓋掉編輯區，
   * 把關的條件與那個對話框因此只有一份。
   */
  function guardOverwritingDraft(action: () => void) {
    if (strategyApplication.hasUnsavedChanges(loadedContent.value, readCurrentContent())) {
      pendingDraftAction.value = action
      openDialog.value = 'discard'
      return
    }

    action()
  }

  function confirmDiscard() {
    const action = pendingDraftAction.value
    pendingDraftAction.value = null
    openDialog.value = 'none'

    action?.()
  }

  function loadStrategy(id: number) {
    const strategy = strategies.value.find(candidate => candidate.id === id)
    if (strategy === undefined) {
      return
    }

    applyContent(strategy.content)
    activeStrategy.value = strategy
    loadedContent.value = strategy.content
    openDialog.value = 'none'
    clearMessages()

    if (!strategy.frameRecognised) {
      noticeMessage.value
        = `「${strategy.name}」的算式認不出外框，已整段帶進編輯區——它看起來不是在這裡寫出來的。`
    }
  }

  /**
   * 有使用中的那一支就存回它，沒有就先問名字。呼叫端不必自己判斷。
   * 名字沿用它原本的——**改名是另一個動作**，儲存不會順手改掉它。
   */
  async function saveStrategy() {
    if (activeStrategy.value === null) {
      openDialog.value = 'name'
      nameErrorMessage.value = null
      return
    }

    await writeStrategy(activeStrategy.value.name, activeStrategy.value.id)
  }

  function openNameDialog() {
    openDialog.value = 'name'
    nameErrorMessage.value = null
  }

  /** 只有手上真的有一支時才問得出「要改成什麼名字」。 */
  function openRenameDialog() {
    if (activeStrategy.value === null) {
      return
    }

    openDialog.value = 'rename'
    nameErrorMessage.value = null
  }

  async function createStrategy(name: string) {
    await writeStrategy(name, undefined)
  }

  /**
   * 替使用中的那一支改名。它走的是同一條存檔路徑——改名就是「內容照舊、名字換掉」的一次儲存，
   * 因此名稱被佔用、那一支已經不在、連不上後端，三種失敗的處理完全不必重寫一遍。
   */
  async function renameStrategy(name: string) {
    if (activeStrategy.value === null) {
      return
    }

    await writeStrategy(name, activeStrategy.value.id)
  }

  async function writeStrategy(name: string, id: number | undefined) {
    saving.value = true
    clearMessages()

    try {
      const saved = await strategyApplication.saveStrategy(
        new StrategyWriteDto(name, readCurrentContent(), id))

      activeStrategy.value = saved
      loadedContent.value = saved.content
      openDialog.value = 'none'
      noticeMessage.value = `已儲存「${saved.name}」。`
      await refreshStrategies()
    }
    catch (error: unknown) {
      // 名稱的問題留在取名對話框裡就地說；其餘的整塊告知。
      // 兩種都**不動畫面上的內容**——一次存檔失敗不該連帶弄丟使用者寫的東西。
      // 回到原本那一個問名字的對話框——改名時退回改名、另存時退回另存，
      // 使用者才不會被丟到一個他沒打開過的地方。
      if (error instanceof StrategyNameConflictError || error instanceof StrategyFieldError) {
        openDialog.value = openDialog.value === 'rename' ? 'rename' : 'name'
        nameErrorMessage.value = error.message
        return
      }

      errorMessage.value = messageOf(error, '儲存策略時發生未預期的錯誤。')
    }
    finally {
      saving.value = false
    }
  }

  function askToDelete(id: number) {
    pendingStrategyId.value = id
    openDialog.value = 'delete'
  }

  async function confirmDelete() {
    const id = pendingStrategyId.value
    pendingStrategyId.value = null
    if (id === null) {
      return
    }

    clearMessages()

    try {
      await strategyApplication.deleteStrategy(id)

      // 刪掉的若是正在用的那一支，**編輯區的內容留著不動**，只解除關聯——
      // 使用者的工作不能被另一個動作弄丟。之後按儲存就等同另存為新策略。
      if (activeStrategy.value?.id === id) {
        activeStrategy.value = null
        loadedContent.value = null
      }

      await refreshStrategies()
      openDialog.value = 'library'
    }
    catch (error: unknown) {
      errorMessage.value = messageOf(error, '刪除策略時發生未預期的錯誤。')
      openDialog.value = 'library'
    }
  }

  function clearMessages() {
    noticeMessage.value = null
    errorMessage.value = null
    nameErrorMessage.value = null
  }

  function messageOf(error: unknown, fallback: string): string {
    if (error instanceof BackendUnreachableError) {
      return '連不上後端，請確認它已經啟動。'
    }
    if (error instanceof StrategyNotFoundError) {
      return error.message
    }
    if (error instanceof Error) {
      return error.message
    }

    return fallback
  }

  return {
    strategies,
    activeStrategy,
    openDialog,
    saving,
    listErrorMessage,
    nameErrorMessage,
    noticeMessage,
    errorMessage,
    refreshStrategies,
    openLibrary,
    closeDialog,
    selectStrategy,
    startBlankStrategy,
    confirmDiscard,
    saveStrategy,
    openNameDialog,
    openRenameDialog,
    createStrategy,
    renameStrategy,
    askToDelete,
    confirmDelete,
  }
}
