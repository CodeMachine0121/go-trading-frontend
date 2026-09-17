import {
  DROP_ZONE_SELECTOR,
  PIECE_SELECTOR,
  applyDropOn,
  applyHoverOn,
  pickedUpPieceOf,
} from '~/utilities/piece-drag-markup'

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

/**
 * 把工作檯上的拖曳接到指標事件上。
 *
 * **為什麼不用瀏覽器內建的拖放**：原生拖曳不會從一個 `<button>` 上起頭，就算它的
 * 祖先標了 `draggable` 也一樣，而且各家瀏覽器對「標了 draggable 的按鈕」的處理並不
 * 一致——Safari 至今幾乎不讓它起頭。一塊零件的下半張臉是三顆信號開關，右上角還有
 * 兩顆小按鈕，於是零件身上被挖出好幾個洞：按在上面往外拉什麼都不會發生，而使用者
 * 沒有任何辦法看出是哪幾個地方。那不是補得完的洞，是那套 API 的性質。
 *
 * interact.js 是純指標事件（mouse / touch / pen）的，它不問被按住的是不是按鈕，
 * 也因此順手拿到了觸控。一起換掉的還有原生拖曳那張改不了的半透明殘影。
 *
 * 這一層**只認手勢與 DOM**，一句規則都不知道：讀出被按住的是哪一塊、放下的是哪一格
 * （怎麼讀住在 piece-drag-markup），剩下的交給 usePieceDrag。
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
        start(event) {
          const target = event.target as HTMLElement
          const picked = pickedUpPieceOf(target)
          if (picked === null) {
            return
          }

          carriedOffset.x = 0
          carriedOffset.y = 0
          pieceDrag.pickUp(picked.sourceLabel, picked.origin)

          // 被拿起來的那一塊浮起來，而且不再擋住它底下的落點。
          // position 要一起給：z-index 對一個 static 的元素不生效，
          // 於是它會從別塊零件底下穿過去。
          target.style.position = 'relative'
          target.style.zIndex = '2'
          target.style.pointerEvents = 'none'
        },
        move(event) {
          const target = event.target as HTMLElement
          carriedOffset.x += event.dx
          carriedOffset.y += event.dy
          target.style.transform = `translate(${carriedOffset.x}px, ${carriedOffset.y}px)`
        },
        end(event) {
          const target = event.target as HTMLElement
          target.style.transform = ''
          target.style.position = ''
          target.style.zIndex = ''
          target.style.pointerEvents = ''
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
      ondragenter: event => applyHoverOn(event.target, pieceDrag),
      ondragleave: () => pieceDrag.leaveHover(),
      ondrop: event => applyDropOn(event.target, pieceDrag),
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
