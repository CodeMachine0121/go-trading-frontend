import { AssistantTriggerBoundsDto } from '~/domain/models/dto/assistant-trigger-bounds-dto'
import { AssistantTriggerPositionDto } from '~/domain/models/dto/assistant-trigger-position-dto'
import type { AssistantTriggerApplication } from '~/application/assistant-trigger-application'

/**
 * 那顆鍵多大、邊緣留多少。
 *
 * 大小是**一個數字，寫在這裡**，並由元件照著畫（不是 CSS 一份、這裡再抄一份）。
 * 夾回範圍的算式要用到它，而算式用的數字與畫出來的大小一旦對不上，
 * 那顆鍵就會在靠邊的時候露出去一點或差一點——那種差距沒有人會想到要去查。
 *
 * 64 像素是一顆手指按得舒服的圓鍵，也還不至於在小視窗上擋掉太多東西。
 */
const TRIGGER_SIZE_PIXELS = 64
const TRIGGER_MARGIN_PIXELS = 12

/**
 * 那顆叫出助手的鍵：擺在哪裡，以及拖曳它這件事。
 *
 * 它與「我們正在談什麼」、「抽屜開著沒有」都分開，因為它們的生命週期不同：
 * 這一個是**這台裝置的習慣**（記在瀏覽器裡、跨工作階段活著），
 * 那兩個是這一次瀏覽的狀態。
 *
 * 拖曳中的 pointer 事件掛在 window 上而不是那顆鍵上，因為手一快就會離開那顆鍵——
 * 掛在鍵上的話，拖到一半游標跑出去，那顆鍵就黏在半路上不動了。
 */
export function useAssistantTrigger(
  /**
   * 要問的是哪一個 application。預設就是組裝根注入的那一個；
   * 它存在的理由與對話那一支相同：讓這裡的拖曳編排測得到。
   */
  assistantTriggerApplication: AssistantTriggerApplication
    = useNuxtApp().$assistantTriggerApplication,
) {
  /**
   * 共用狀態裡放的是**兩個數字**，不是那個 DTO。
   *
   * 這一份要從伺服器端交到瀏覽器端，而能被交過去的只有純資料——放一個 class 實例
   * 進去，整頁會在序列化那一步就死掉（`Cannot stringify arbitrary non-POJOs`）。
   * 對外仍然交出 DTO：邊界的形狀不因為儲存方式而改變。
   */
  const placement = useState('assistant-trigger-placement', () => ({
    right: TRIGGER_MARGIN_PIXELS,
    bottom: TRIGGER_MARGIN_PIXELS,
  }))
  const dragging = useState('assistant-trigger-dragging', () => false)

  /** 那顆鍵目前擺在哪裡，交出去的形狀。 */
  const position = computed(
    () => new AssistantTriggerPositionDto(placement.value.right, placement.value.bottom))

  /** 換一個位置。存的是兩個數字，見上面那段。 */
  function applyPosition(next: AssistantTriggerPositionDto): void {
    placement.value = { right: next.right, bottom: next.bottom }
  }

  /** 拖曳開始時的位置與游標。放下時要靠它們回答「這是拖還是按」。 */
  let dragOrigin: AssistantTriggerPositionDto | null = null
  let pointerOrigin: { x: number, y: number } | null = null

  /** 目前視窗放得下那顆鍵的範圍。每次都重新量，因為視窗隨時會變。 */
  function currentBounds(): AssistantTriggerBoundsDto {
    return new AssistantTriggerBoundsDto(
      window.innerWidth, window.innerHeight, TRIGGER_SIZE_PIXELS, TRIGGER_MARGIN_PIXELS)
  }

  /** 讀回這台裝置記住的位置。夾回看得見的範圍是 domain 的事。 */
  function loadTriggerPosition(): void {
    applyPosition(assistantTriggerApplication.loadTriggerPosition(currentBounds()))
  }

  /** 視窗大小改變時把它拉回看得見的地方，否則它會被推到視窗外面。 */
  function keepTriggerInView(): void {
    applyPosition(assistantTriggerApplication.resolveTriggerPosition(
      position.value, currentBounds()))
  }

  /**
   * 開始拖。回傳這一次的收尾函式：呼叫端負責在放下時叫它，
   * 並從它拿到「剛才那一下是按了一下嗎」——是的話才打開抽屜。
   */
  function startDrag(pointerX: number, pointerY: number): void {
    dragOrigin = position.value
    pointerOrigin = { x: pointerX, y: pointerY }
    dragging.value = true
  }

  /** 拖曳中：游標移了多少，那顆鍵就往反方向離邊緣多遠。 */
  function moveDrag(pointerX: number, pointerY: number): void {
    if (dragOrigin === null || pointerOrigin === null) {
      return
    }

    applyPosition(assistantTriggerApplication.resolveTriggerPosition(
      new AssistantTriggerPositionDto(
        dragOrigin.right - (pointerX - pointerOrigin.x),
        dragOrigin.bottom - (pointerY - pointerOrigin.y),
      ),
      currentBounds(),
    ))
  }

  /**
   * 放下。回傳剛才那一下**是不是按了一下**（而不是拖曳），
   * 呼叫端據此決定要不要打開抽屜。
   *
   * 真的拖過才記住位置：每一次單純的按都寫一次瀏覽器儲存，是白寫的。
   */
  function endDrag(): boolean {
    const origin = dragOrigin
    dragging.value = false
    dragOrigin = null
    pointerOrigin = null

    if (origin === null) {
      return false
    }

    if (!assistantTriggerApplication.wasDragged(origin, position.value)) {
      return true
    }

    assistantTriggerApplication.rememberTriggerPosition(position.value)

    return false
  }

  return {
    triggerSize: TRIGGER_SIZE_PIXELS,
    position,
    dragging,
    loadTriggerPosition,
    keepTriggerInView,
    startDrag,
    moveDrag,
    endDrag,
  }
}
