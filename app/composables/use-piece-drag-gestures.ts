import type { ConditionSideVo } from '~/domain/models/vo/condition-side-vo'
import { CONDITION_SIDES } from '~/domain/models/vo/condition-side-vo'
import type { PieceDragOrigin } from '~/composables/use-piece-drag'

/**
 * 零件身上「拿得起來」的標記，以及「放得下去」的標記。
 *
 * 用 data 屬性而不是 ref 陣列，因為 interact.js 認的是**選擇器**：註冊一次，之後
 * 新長出來的零件自動也拿得起來。一塊一塊去掛的話，每次墊子重排都得掛一輪，
 * 而漏掉的那一塊不會報錯，只會安靜地拖不動——正是我們在修的那個毛病。
 */
const PIECE_SELECTOR = '[data-piece-label]'
const DROP_ZONE_SELECTOR = '[data-drop-kind]'

/** 走超過這麼多像素才算一次拖曳。沒走就是一次普通的 click，開關照樣切換。 */
const DRAG_START_TOLERANCE_PIXELS = 4

/** 一次真的拖過的動作結束後，瀏覽器可能補一個 click。那一個要吃掉。 */
function swallowTheClickAfterADrag() {
  function swallow(clickEvent: MouseEvent) {
    clickEvent.stopPropagation()
    clickEvent.preventDefault()
  }

  document.addEventListener('click', swallow, true)
  // click 是在 pointerup 之後、這個 timeout 之前同步送出的，所以這裡不會吃到下一個。
  window.setTimeout(() => document.removeEventListener('click', swallow, true), 0)
}

function isConditionSide(value: string | undefined): value is ConditionSideVo {
  return CONDITION_SIDES.some(side => side === value)
}

function isDragOrigin(value: string | undefined): value is PieceDragOrigin {
  return value === 'shelf' || isConditionSide(value)
}

/**
 * 把工作檯上的拖曳接到指標事件上。
 *
 * 它只認 DOM 與手勢，一句規則都不知道：讀出被按住的是哪一塊、放下的是哪一格，
 * 剩下的交給 usePieceDrag。為什麼不用瀏覽器內建的拖放，見那一支的說明。
 *
 * interact.js 只在瀏覽器裡載入——它一進來就摸 window，而這個站是會做伺服器渲染的。
 *
 * @param pieceDrag 手上拿著什麼、放下去算哪一種搬動
 * @returns benchElement 要掛到工作檯最外層那個元素上；選擇器只在它底下生效
 */
export function usePieceDragGestures(pieceDrag: ReturnType<typeof usePieceDrag>) {
  const benchElement = ref<HTMLElement | null>(null)

  /** 拖到現在累積移動了多少。一次只拖得動一塊，所以一組數字就夠。 */
  const carriedOffset = { x: 0, y: 0 }

  /** 解除掛載時要收回來的那幾個註冊。`null` 就是還沒掛上或已經收了。 */
  let teardown: (() => void) | null = null

  /**
   * 這一頁還在不在。
   *
   * 載入 interact.js 要等一個 await，而使用者可能在那之間就離開了這一頁——
   * 那時解除掛載已經跑完，接著才掛上去的那兩個註冊就沒有人收得回來了。
   */
  let stillMounted = true

  function dropZoneOf(element: Element): HTMLElement | null {
    return element instanceof HTMLElement ? element : null
  }

  /** 指標移到某一格上。只有插入帶會說「懸在第幾格」，其餘兩種沒有位置可言。 */
  function onDragEnter(zone: HTMLElement) {
    const side = zone.dataset.dropSide
    if (zone.dataset.dropKind === 'slot' && isConditionSide(side)) {
      pieceDrag.hoverOver(side, Number(zone.dataset.dropPosition))
    }
  }

  /** 放下去。三種落點各自是一種搬動——哪一種由這一格自己說。 */
  function onDrop(zone: HTMLElement) {
    const side = zone.dataset.dropSide

    if (zone.dataset.dropKind === 'shelf') {
      pieceDrag.dropOnShelf()

      return
    }

    if (!isConditionSide(side)) {
      return
    }

    if (zone.dataset.dropKind === 'piece') {
      pieceDrag.dropOntoPiece(side, zone.dataset.pieceLabel ?? '')

      return
    }

    pieceDrag.dropOnMat(side, Number(zone.dataset.dropPosition))
  }

  onMounted(async () => {
    const root = benchElement.value
    if (root === null) {
      return
    }

    const interact = (await import('interactjs')).default
    if (!stillMounted) {
      return
    }

    interact.pointerMoveTolerance(DRAG_START_TOLERANCE_PIXELS)
    // 落點的位置每次移動都重量一次。預設只在拿起來那一刻量一次，而墊子上的格子
    // 會在拖曳途中改變高度（一組散開、一塊被收走），量一次的話後半段就全錯位。
    interact.dynamicDrop(true)

    const pieces = interact(PIECE_SELECTOR, { context: root }).draggable({
      autoScroll: true,
      listeners: {
        start(event: { target: HTMLElement }) {
          const label = event.target.dataset.pieceLabel
          const origin = event.target.dataset.pieceOrigin
          if (label === undefined || !isDragOrigin(origin)) {
            return
          }

          carriedOffset.x = 0
          carriedOffset.y = 0
          pieceDrag.pickUp(label, origin)

          // 被拿起來的那一塊浮起來，而且不再擋住它底下的落點。
          // position 要一起給：z-index 對一個 static 的元素不生效，
          // 於是它會從別塊零件底下穿過去。
          event.target.style.position = 'relative'
          event.target.style.zIndex = '2'
          event.target.style.pointerEvents = 'none'
        },
        move(event: { target: HTMLElement, dx: number, dy: number }) {
          carriedOffset.x += event.dx
          carriedOffset.y += event.dy
          event.target.style.transform
            = `translate(${carriedOffset.x}px, ${carriedOffset.y}px)`
        },
        end(event: { target: HTMLElement }) {
          event.target.style.transform = ''
          event.target.style.position = ''
          event.target.style.zIndex = ''
          event.target.style.pointerEvents = ''
          swallowTheClickAfterADrag()

          // 放掉手上那一塊留到這一輪事件都送完之後：drop 與 dragend 誰先誰後由
          // interact.js 決定，而先清掉的話，後到的那個 drop 會發現手上什麼都沒有。
          window.setTimeout(() => pieceDrag.letGo(), 0)
        },
      },
    })

    const zones = interact(DROP_ZONE_SELECTOR, { context: root }).dropzone({
      accept: PIECE_SELECTOR,
      // 以**指標**落在哪裡判定，不是以那塊零件蓋住了多少：使用者瞄的是游標，
      // 而一塊零件比一條插入帶高得多，用面積判定會一直落在隔壁那一格。
      overlap: 'pointer',
      ondragenter: (event: { target: Element }) => {
        const zone = dropZoneOf(event.target)
        if (zone !== null) {
          onDragEnter(zone)
        }
      },
      ondragleave: () => pieceDrag.leaveHover(),
      ondrop: (event: { target: Element }) => {
        const zone = dropZoneOf(event.target)
        if (zone !== null) {
          onDrop(zone)
        }
      },
    })

    teardown = () => {
      pieces.unset()
      zones.unset()
    }
  })

  onBeforeUnmount(() => {
    stillMounted = false
    teardown?.()
    teardown = null
  })

  return { benchElement }
}
