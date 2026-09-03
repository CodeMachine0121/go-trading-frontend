import type { StrategyApplication } from '~/application/strategy-application'
import type { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'
import type { StrategyDto } from '~/domain/models/dto/strategy-dto'
import { StrategyWriteDto } from '~/domain/models/dto/strategy-write-dto'
import { StrategyFieldError } from '~/domain/errors/strategy-field-error'
import { StrategyNameConflictError } from '~/domain/errors/strategy-name-conflict-error'
import { StrategyNotFoundError } from '~/domain/errors/strategy-not-found-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

/** 目前哪一個對話框疊在畫面上。一次只有一個——三個同時開沒有任何意義。 */
type OpenDialog = 'none' | 'library' | 'name' | 'discard' | 'delete'

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

  /** 被確認擋下來的那件事。使用者說「好」之後才真的做。 */
  const pendingStrategyId = ref<number | null>(null)

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
  }

  /**
   * 挑一支來用。會蓋掉編輯區的動作在有未儲存變更時一律先問過——
   * 其他事情做錯了可以重來，弄丟寫到一半的算式沒得重來。
   */
  function selectStrategy(id: number) {
    if (strategyApplication.hasUnsavedChanges(loadedContent.value, readCurrentContent())) {
      pendingStrategyId.value = id
      openDialog.value = 'discard'
      return
    }

    loadStrategy(id)
  }

  function confirmDiscard() {
    const id = pendingStrategyId.value
    pendingStrategyId.value = null
    openDialog.value = 'none'

    if (id !== null) {
      loadStrategy(id)
    }
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

  /** 有使用中的那一支就存回它，沒有就先問名字。呼叫端不必自己判斷。 */
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

  async function createStrategy(name: string) {
    await writeStrategy(name, undefined)
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
      if (error instanceof StrategyNameConflictError || error instanceof StrategyFieldError) {
        openDialog.value = 'name'
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
    confirmDiscard,
    loadStrategy,
    saveStrategy,
    openNameDialog,
    createStrategy,
    askToDelete,
    confirmDelete,
  }
}
