import type { StrategyScriptApplication } from '~/application/strategy-script-application'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'
import type { StrategyScriptMarketplaceApplication } from '~/application/strategy-script-marketplace-application'
import type { PublishedStrategyScriptDto } from '~/domain/models/dto/published-strategy-script-dto'
import type { StrategyScriptContentDto } from '~/domain/models/dto/strategy-script-content-dto'
import type { StrategyScriptDto } from '~/domain/models/dto/strategy-script-dto'
import { StrategyScriptWriteDto } from '~/domain/models/dto/strategy-script-write-dto'
import { StrategyScriptFieldError } from '~/domain/errors/strategy-script-field-error'
import { StrategyScriptNameConflictError } from '~/domain/errors/strategy-script-name-conflict-error'
import { StrategyScriptNotFoundError } from '~/domain/errors/strategy-script-not-found-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

/** 目前哪一個對話框疊在畫面上。一次只有一個——好幾個同時開沒有任何意義。 */
type OpenDialog = 'none' | 'library' | 'name' | 'rename' | 'discard' | 'delete' | 'withdraw'

/**
 * 策略腳本在指標計算這個畫面上的**狀態**：留著哪些、正在用哪一支、載入當下那一份長什麼樣、
 * 哪個對話框開著、哪件事正在進行。
 *
 * **它不做任何業務判斷**——「有沒有改過」「這次算新增還是更新」一律問 Application。
 * 它持有的是狀態，不是規則。把這些從面板搬出來，是因為面板該剩下的只有
 * 「使用者按了什麼」與「畫面怎麼呈現結果」。
 */
export function useStrategyScriptLibrary(
  strategyScriptApplication: StrategyScriptApplication,
  /**
   * 市集那一條線。這裡只用它做一件事：把加入來的那一支從自己的清單拿掉。
   *
   * 那件事屬於這裡而不是市集頁，因為它改變的是**這一份清單**——使用者是在清單上看到
   * 那一支、也是在清單上決定不要它的。市集頁上也有一顆做同一件事的按鈕，
   * 兩邊走的是同一條路，只是入口不同。
   */
  strategyScriptMarketplaceApplication: StrategyScriptMarketplaceApplication,
  readCurrentContent: () => StrategyScriptContentDto,
  applyContent: (content: StrategyScriptContentDto) => void,
  /** 一份空白的策略腳本內容。「空白長什麼樣」由畫面定義，這裡只負責在對的時機套用它。 */
  blankContent: StrategyScriptContentDto,
  /**
   * 這個庫只管哪一種行情的策略腳本。清單只列這一種——另一種在這一頁跑不動，
   * 列出來只會換來一個挑了就失敗的選項。存下的是哪一種則由內容自己說。
   */
  marketDataKind: MarketDataKind = 'kCandle',
) {
  /**
   * 自己寫的那些。它們帶著算式，所以載得進編輯器、改得動、刪得掉、發得出去。
   */
  const strategyScripts = ref<StrategyScriptDto[]>([])
  /**
   * 從市集加入的那些。它們**沒有算式**，所以這裡沒有任何一段程式碼能把它們載進編輯器——
   * 那不是一條要遵守的規則，是型別上寫不出來的事。
   */
  const adoptedStrategyScripts = ref<PublishedStrategyScriptDto[]>([])
  const activeStrategyScript = ref<StrategyScriptDto | null>(null)
  /**
   * 正在工作區裡的那一支**我加入的**策略腳本。有它的時候整個工作區是唯讀的。
   *
   * 它與 `activeStrategyScript` 不會同時有值：一個是自己的、改得動的那一支，
   * 一個是別人的、只能用的那一支，工作區一次只裝得下一支。「現在是不是唯讀」
   * 只看這一個——畫面上每一個停用都從它衍生，不各自判斷。
   */
  const activeAdoptedStrategyScript = ref<PublishedStrategyScriptDto | null>(null)
  /** 工作區是唯讀的：裡面是一支我加入的策略腳本——看得到、用得了、改不動。 */
  const readOnly = computed(() => activeAdoptedStrategyScript.value !== null)
  /**
   * 執行時要指名的那一支。唯讀時工作區裡沒有算式可以送，所以試跑與回測都指名它本身；
   * 自己的那一支則照舊帶著畫面上的算式送出去（它可能改了還沒存）。
   */
  const namedStrategyScriptId = computed(() => activeAdoptedStrategyScript.value?.id)
  /** 載入當下那一份。跟現在畫面上的比，就知道有沒有東西還沒存。 */
  const loadedContent = ref<StrategyScriptContentDto | null>(null)

  const openDialog = ref<OpenDialog>('none')
  const saving = ref(false)
  const listErrorMessage = ref<string | null>(null)
  const nameErrorMessage = ref<string | null>(null)
  const noticeMessage = ref<string | null>(null)
  const errorMessage = ref<string | null>(null)

  /** 被確認擋下來的「要刪哪一支」。使用者說「好」之後才真的刪。 */
  const pendingStrategyScriptId = ref<number | null>(null)

  /**
   * 被確認擋下來的「會蓋掉編輯區的那件事」。
   *
   * 存的是**待執行的動作**而不是一個識別碼，因為會蓋掉編輯區的動作不只一種：
   * 載入某一支有識別碼，開一份空白沒有。存動作的話，確認之後只要把它叫出來，
   * 不必知道那是哪一種——之後再多一個這類動作也不必回頭改這裡。
   */
  const pendingDraftAction = shallowRef<(() => void) | null>(null)

  async function refreshStrategyScripts() {
    listErrorMessage.value = null

    try {
      const available = await strategyScriptApplication.listAvailableStrategyScripts(marketDataKind)
      strategyScripts.value = [...available.mine]
      adoptedStrategyScripts.value = [...available.adopted]
      refreshActiveStrategyScript()
    }
    catch (error: unknown) {
      // 取不到清單時**不清空手上這一份**——把它清空等於告訴使用者他什麼都沒存過。
      listErrorMessage.value = messageOf(error, '取得策略腳本清單時發生未預期的錯誤。')
    }
  }

  /**
   * 讓「使用中的那一支」跟上剛讀回來的那一份。
   *
   * 沒有這一步，關於那一支的每一件事都會停在載入當下的樣子——最明顯的是分享狀態：
   * 剛按過收回，眼前那顆按鈕還寫著「收回」，而看的人只會再按一次。
   *
   * **只換那份紀錄，不動 `loadedContent`。** 那一份是「載入當下畫面上是什麼」，
   * 拿新讀回來的內容覆蓋它，等於把使用者還沒存的修改當成已經存了。
   *
   * 清單裡找不到它時什麼都不做：那代表它在別的地方被刪掉了，而「刪掉正在用的那一支
   * 只解除關聯、內容留著」是刪除那條路自己的規則，不該由一次重讀順手執行。
   */
  function refreshActiveStrategyScript() {
    if (activeStrategyScript.value === null) {
      return
    }

    const refreshed = strategyScripts.value.find(candidate => candidate.id === activeStrategyScript.value?.id)
    if (refreshed === undefined) {
      return
    }

    activeStrategyScript.value = refreshed
  }

  function openLibrary() {
    openDialog.value = 'library'
    void refreshStrategyScripts()
  }

  function closeDialog() {
    openDialog.value = 'none'
    nameErrorMessage.value = null
    pendingStrategyScriptId.value = null
    pendingDraftAction.value = null
  }

  /**
   * 挑一支來用。
   *
   * **加入來的那一支載進來的是唯讀的工作區**：它的指標值種類與旋鈕照實換上、算式是空的，
   * 而整個工作區改不動。以前它不進工作區、只跳一句話，於是編輯區上留著的仍是上一支——
   * 讀起來像「我正在改加入的那一支」。換上它自己的內容，畫面說的才是實話。
   *
   * 兩種都會換掉工作區，所以兩種都先過「有沒有還沒存的東西」那一關。
   * 反過來離開唯讀時那一關必然放行：唯讀的工作區裡沒有任何一格改得動。
   */
  function selectStrategyScript(id: number) {
    const adopted = adoptedStrategyScripts.value.find(candidate => candidate.id === id)
    if (adopted !== undefined) {
      guardOverwritingDraft(() => {
        const content = adopted.toContent()
        applyContent(content)
        activeStrategyScript.value = null
        activeAdoptedStrategyScript.value = adopted
        loadedContent.value = content
        openDialog.value = 'none'
        clearMessages()
      })

      return
    }

    guardOverwritingDraft(() => loadStrategyScript(id))
  }

  /**
   * 開一份新的空白——編輯器裡的「開新檔案」。
   *
   * 它**到不了應用程式邊界**：沒有請求、沒有 await，純粹是把畫面上這一份稿子換成一份空白，
   * 並解除它與任何一支策略腳本的關聯。因此接著按儲存就是問名字、另存為新的一支，
   * 不會蓋掉剛才在用的那一支。
   *
   * `loadedContent` 設成 null 而不是那份空白，因為「沒有載入過任何策略腳本」就是實話；
   * 而既有的「還沒載入過時只看算式是不是空白」那條規則剛好正是我們要的行為——
   * 一個字都還沒打就再按一次，不必再問一遍。
   */
  function startBlankStrategyScript() {
    guardOverwritingDraft(applyBlankContent)
  }

  function applyBlankContent() {
    applyContent(blankContent)
    activeStrategyScript.value = null
    activeAdoptedStrategyScript.value = null
    loadedContent.value = null
    openDialog.value = 'none'
    clearMessages()
    // 編輯區本來就空的時候，少了這一句，那顆按鈕看起來像壞了。
    noticeMessage.value = '已經開了一份新的空白策略腳本。'
  }

  /** 編輯區裡有還沒存的東西。離開這一頁、蓋掉編輯區之前都要先問這一句。 */
  function hasUnsavedDraft(): boolean {
    return strategyScriptApplication.hasUnsavedChanges(loadedContent.value, readCurrentContent())
  }

  /**
   * 這件事會蓋掉編輯區，所以有還沒存的東西時先問過——
   * 其他事情做錯了可以重來，弄丟寫到一半的算式沒得重來。
   *
   * 「載入另一支」與「開一份空白」共用它：兩者都會蓋掉編輯區，
   * 把關的條件與那個對話框因此只有一份。
   */
  function guardOverwritingDraft(action: () => void) {
    if (hasUnsavedDraft()) {
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

  function loadStrategyScript(id: number) {
    const strategyScript = strategyScripts.value.find(candidate => candidate.id === id)
    if (strategyScript === undefined) {
      return
    }

    applyContent(strategyScript.content)
    activeStrategyScript.value = strategyScript
    activeAdoptedStrategyScript.value = null
    loadedContent.value = strategyScript.content
    openDialog.value = 'none'
    clearMessages()
  }

  /**
   * 有使用中的那一支就存回它，沒有就先問名字。呼叫端不必自己判斷。
   * 名字沿用它原本的——**改名是另一個動作**，儲存不會順手改掉它。
   */
  async function saveStrategyScript() {
    if (activeStrategyScript.value === null) {
      openDialog.value = 'name'
      nameErrorMessage.value = null
      return
    }

    await writeStrategyScript(
      activeStrategyScript.value.name, activeStrategyScript.value.id, activeStrategyScript.value.description)
  }

  function openNameDialog() {
    openDialog.value = 'name'
    nameErrorMessage.value = null
  }

  /** 只有手上真的有一支時才問得出「要改成什麼名字」。 */
  function openRenameDialog() {
    if (activeStrategyScript.value === null) {
      return
    }

    openDialog.value = 'rename'
    nameErrorMessage.value = null
  }

  async function createStrategyScript(name: string, description: string) {
    await writeStrategyScript(name, undefined, description)
  }

  /**
   * 替使用中的那一支改名。它走的是同一條存檔路徑——改名就是「內容照舊、名字換掉」的一次儲存，
   * 因此名稱被佔用、那一支已經不在、連不上後端，三種失敗的處理完全不必重寫一遍。
   */
  async function renameStrategyScript(name: string, description: string) {
    if (activeStrategyScript.value === null) {
      return
    }

    await writeStrategyScript(name, activeStrategyScript.value.id, description)
  }

  async function writeStrategyScript(name: string, id: number | undefined, description: string) {
    saving.value = true
    clearMessages()

    try {
      const saved = await strategyScriptApplication.saveStrategyScript(
        new StrategyScriptWriteDto(name, readCurrentContent(), id, description))

      activeStrategyScript.value = saved
      loadedContent.value = saved.content
      openDialog.value = 'none'
      noticeMessage.value = `已儲存「${saved.name}」。`
      await refreshStrategyScripts()
    }
    catch (error: unknown) {
      // 名稱的問題留在取名對話框裡就地說；其餘的整塊告知。
      // 兩種都**不動畫面上的內容**——一次存檔失敗不該連帶弄丟使用者寫的東西。
      // 回到原本那一個問名字的對話框——改名時退回改名、另存時退回另存，
      // 使用者才不會被丟到一個他沒打開過的地方。
      if (error instanceof StrategyScriptNameConflictError || error instanceof StrategyScriptFieldError) {
        openDialog.value = openDialog.value === 'rename' ? 'rename' : 'name'
        nameErrorMessage.value = error.message
        return
      }

      errorMessage.value = messageOf(error, '儲存策略腳本時發生未預期的錯誤。')
    }
    finally {
      saving.value = false
    }
  }

  /**
   * 把自己的那一支放上市集。**不先問**：發佈做錯了收回就好，而且中間沒有人失去任何東西。
   */
  async function publishStrategyScript(id: number) {
    await changePublication(id, () => strategyScriptApplication.publishStrategyScript(id), '已經分享到市集。')
  }

  /**
   * 收回之前先問一次。與發佈不對稱是刻意的：收回做錯了，每一個加入過它的人都要重新加入
   * 一次，而**你不會知道有誰**——一個影響到別人、而且自己補不回來的動作，值得多問一次。
   */
  function askToWithdraw(id: number) {
    pendingStrategyScriptId.value = id
    openDialog.value = 'withdraw'
  }

  async function confirmWithdraw() {
    const id = pendingStrategyScriptId.value
    pendingStrategyScriptId.value = null
    if (id === null) {
      return
    }

    await changePublication(id, () => strategyScriptApplication.withdrawStrategyScript(id), '已經從市集收回。')
  }

  /**
   * 放上市集與收回走同一條路：兩者都是同一件事的兩個方向，
   * 所以「成功要說什麼、失敗要說什麼、之後要重讀清單」也只寫一次。
   *
   * 兩者都以**不開任何對話框**收尾。它們是從主畫面那一排按下來的，收回那一次頂多
   * 開過一個確認框而那個框已經做完事了——收尾時把清單彈出來，等於替使用者打開一個
   * 他沒有要求的東西。
   */
  async function changePublication(
    id: number, change: () => Promise<void>, successMessage: string,
  ) {
    saving.value = true
    clearMessages()

    try {
      await change()
      openDialog.value = 'none'
      noticeMessage.value = successMessage
      await refreshStrategyScripts()
    }
    catch (error: unknown) {
      errorMessage.value = messageOf(error, '變更分享狀態時發生未預期的錯誤。')
      openDialog.value = 'none'
    }
    finally {
      saving.value = false
    }
  }

  /**
   * 把加入來的那一支從自己的清單拿掉。**不先問**：它是別人的東西，拿掉只影響自己的清單，
   * 想要再加回來到市集按一下就有——與刪掉自己的策略腳本完全不同。
   */
  async function abandonStrategyScript(id: number) {
    saving.value = true
    clearMessages()

    try {
      await strategyScriptMarketplaceApplication.abandonStrategyScript(id)

      // 拿掉的正是工作區裡那一支：它已經不在我的清單上，工作區不能還裝著它——
      // 留著的話，畫面仍是它的唯讀樣子，而下一次試跑會指名一支已經不屬於我的策略腳本。
      // 換成一份空白，與「開一份新的空白」同一個樣子；唯讀裡沒有任何還沒存的東西會因此弄丟。
      if (activeAdoptedStrategyScript.value?.id === id) {
        applyContent(blankContent)
        activeAdoptedStrategyScript.value = null
        loadedContent.value = null
      }

      openDialog.value = 'library'
      noticeMessage.value = '已經從你的清單移除。它還在市集上，隨時可以再加回來。'
      await refreshStrategyScripts()
    }
    catch (error: unknown) {
      errorMessage.value = messageOf(error, '從清單移除時發生未預期的錯誤。')
      openDialog.value = 'library'
    }
    finally {
      saving.value = false
    }
  }

  function askToDelete(id: number) {
    pendingStrategyScriptId.value = id
    openDialog.value = 'delete'
  }

  async function confirmDelete() {
    const id = pendingStrategyScriptId.value
    pendingStrategyScriptId.value = null
    if (id === null) {
      return
    }

    clearMessages()

    try {
      await strategyScriptApplication.deleteStrategyScript(id)

      // 刪掉的若是正在用的那一支，**編輯區的內容留著不動**，只解除關聯——
      // 使用者的工作不能被另一個動作弄丟。之後按儲存就等同另存為新策略腳本。
      if (activeStrategyScript.value?.id === id) {
        activeStrategyScript.value = null
        loadedContent.value = null
      }

      await refreshStrategyScripts()
      openDialog.value = 'library'
    }
    catch (error: unknown) {
      errorMessage.value = messageOf(error, '刪除策略腳本時發生未預期的錯誤。')
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
    if (error instanceof StrategyScriptNotFoundError) {
      return error.message
    }
    if (error instanceof Error) {
      return error.message
    }

    return fallback
  }

  return {
    strategyScripts,
    adoptedStrategyScripts,
    activeStrategyScript,
    activeAdoptedStrategyScript,
    readOnly,
    namedStrategyScriptId,
    openDialog,
    saving,
    listErrorMessage,
    nameErrorMessage,
    noticeMessage,
    errorMessage,
    refreshStrategyScripts,
    openLibrary,
    closeDialog,
    selectStrategyScript,
    startBlankStrategyScript,
    confirmDiscard,
    hasUnsavedDraft,
    saveStrategyScript,
    openNameDialog,
    openRenameDialog,
    createStrategyScript,
    renameStrategyScript,
    askToDelete,
    confirmDelete,
    publishStrategyScript,
    askToWithdraw,
    confirmWithdraw,
    abandonStrategyScript,
  }
}
