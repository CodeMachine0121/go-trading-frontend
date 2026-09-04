import type { AssistantDrawerWidthApplication } from '~/application/assistant-drawer-width-application'

/**
 * 抽屜多寬，以及拉動它那條邊這件事。
 *
 * 它與「抽屜開著沒有」分開：一個是**這台裝置的習慣**（記在瀏覽器裡、跨工作階段活著），
 * 一個是這一次瀏覽的開關。
 *
 * 拖曳中的 pointer 事件掛在 window 上而不是那條邊上，因為手一快就會離開那條細邊——
 * 掛在邊上的話，拉到一半游標跑出去，抽屜就停在半路上不動了。
 */
export function useAssistantDrawerWidth(
  /**
   * 要問的是哪一個 application。預設就是組裝根注入的那一個；
   * 它存在的理由與另外兩支相同：讓這裡的拖曳編排測得到。
   */
  assistantDrawerWidthApplication: AssistantDrawerWidthApplication
    = useNuxtApp().$assistantDrawerWidthApplication,
) {
  /**
   * 共用狀態裡放的是**一個數字**，不是任何物件。
   *
   * 這一份要從伺服器端交到瀏覽器端，而能被交過去的只有純資料。
   * 預設值刻意與 domain 的預設一致，好讓伺服器端畫出來的那一版就是常見的樣子。
   */
  const width = useState('assistant-drawer-width', () => 420)
  const resizing = useState('assistant-drawer-resizing', () => false)

  /** 拉動開始時的寬度與游標。放手時要靠它們算出移了多少。 */
  let resizeOriginWidth: number | null = null
  let resizeOriginPointerX: number | null = null

  /** 讀回這台裝置記住的寬度。夾回還能用的範圍是 domain 的事。 */
  function loadDrawerWidth(): void {
    width.value = assistantDrawerWidthApplication.loadDrawerWidth(window.innerWidth)
  }

  /** 視窗變窄時把它收回來，否則抽屜會比視窗還寬。 */
  function keepDrawerWidthUsable(): void {
    width.value = assistantDrawerWidthApplication.resolveDrawerWidth(
      width.value, window.innerWidth)
  }

  function startResize(pointerX: number): void {
    resizeOriginWidth = width.value
    resizeOriginPointerX = pointerX
    resizing.value = true
  }

  /**
   * 拉動中：抽屜靠右，所以**往左拉是變寬**——游標往左移多少，寬度就加多少。
   */
  function moveResize(pointerX: number): void {
    if (resizeOriginWidth === null || resizeOriginPointerX === null) {
      return
    }

    width.value = assistantDrawerWidthApplication.resolveDrawerWidth(
      resizeOriginWidth + (resizeOriginPointerX - pointerX),
      window.innerWidth,
    )
  }

  /**
   * 放手。真的拉動過才記住寬度——放手時寬度與開始時一樣（例如只是點了一下那條邊），
   * 寫一次瀏覽器儲存是白寫的。
   */
  function endResize(): void {
    const originWidth = resizeOriginWidth
    resizing.value = false
    resizeOriginWidth = null
    resizeOriginPointerX = null

    if (originWidth === null || originWidth === width.value) {
      return
    }

    assistantDrawerWidthApplication.rememberDrawerWidth(width.value)
  }

  return {
    width,
    resizing,
    loadDrawerWidth,
    keepDrawerWidthUsable,
    startResize,
    moveResize,
    endResize,
  }
}
