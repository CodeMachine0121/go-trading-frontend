import type { ConditionSideVo } from '~/domain/models/vo/condition-side-vo'
import { CONDITION_SIDES } from '~/domain/models/vo/condition-side-vo'
import type { PieceDragOrigin, usePieceDrag } from '~/composables/use-piece-drag'

/**
 * 工作檯上「拿得起來」與「放得下去」是怎麼寫在畫面上的，以及怎麼讀回來。
 *
 * 這裡是不得已才建立的技術性工具（見 .claude/rules/code-style.md 的門檻）：
 * 它完全無狀態，處理的純粹是 data 屬性這個**載體**——寫上去、讀回來。
 * 一句業務規則都不在這裡：放下去算哪一種搬動、哪些情況什麼都不做，
 * 全部住在 usePieceDrag，這裡只把讀到的東西交過去。
 *
 * **寫與讀在同一個檔案裡，這是重點。** 手勢那一層（usePieceDragGestures）認的是
 * data 屬性，而屬性名稱如果一邊寫在三個元件裡、一邊讀在 composable 裡，兩邊拼法
 * 分岔的那一天沒有任何東西會報錯——只會安靜地拖不動，而那正是這一整輪在修的毛病。
 * 元件一律 `v-bind` 這裡給的東西，於是那個名字全專案只有這裡寫過一次。
 *
 * 用 data 屬性而不是一串 ref，是因為 interact.js 認的是**選擇器**：註冊一次，之後
 * 新長出來的零件自動也拿得起來。一塊一塊去掛的話，每次墊子重排都得掛一輪，
 * 而漏掉的那一塊同樣只會安靜地拖不動。
 */
const PIECE_LABEL_ATTRIBUTE = 'data-piece-label'
const PIECE_ORIGIN_ATTRIBUTE = 'data-piece-origin'
const DROP_KIND_ATTRIBUTE = 'data-drop-kind'
const DROP_SIDE_ATTRIBUTE = 'data-drop-side'
const DROP_POSITION_ATTRIBUTE = 'data-drop-position'

/** interact.js 用這兩個選擇器認出「什麼拿得起來」與「什麼放得下去」。 */
export const PIECE_SELECTOR = `[${PIECE_LABEL_ATTRIBUTE}]`
export const DROP_ZONE_SELECTOR = `[${DROP_KIND_ATTRIBUTE}]`

/**
 * 落點有三種，各自是一種搬動：格與格之間的插入帶、另一塊零件（疊上去＝扣成一組）、
 * 以及架子（拖回去＝從墊子上收走）。
 */
const DROP_KIND_SLOT = 'slot'
const DROP_KIND_PIECE = 'piece'
const DROP_KIND_SHELF = 'shelf'

/** 一塊拿得起來的零件要帶的標記：它是誰，以及它是從哪裡被拿起來的。 */
export function pieceDragMarkup(sourceLabel: string, origin: PieceDragOrigin) {
  return {
    [PIECE_LABEL_ATTRIBUTE]: sourceLabel,
    [PIECE_ORIGIN_ATTRIBUTE]: origin,
  }
}

/** 一條插入帶要帶的標記：放下去就是擺到這一邊的第幾格。 */
export function slotDropMarkup(side: ConditionSideVo, position: number) {
  return {
    [DROP_KIND_ATTRIBUTE]: DROP_KIND_SLOT,
    [DROP_SIDE_ATTRIBUTE]: side,
    [DROP_POSITION_ATTRIBUTE]: String(position),
  }
}

/**
 * 一塊擺著的零件同時是落點要帶的標記。
 *
 * 它疊在 pieceDragMarkup 之上——同一個元素既拿得起來也放得下去，而「放下去是哪一塊」
 * 讀的就是它自己的代號，不必再寫一次。
 */
export function pieceDropMarkup(side: ConditionSideVo) {
  return {
    [DROP_KIND_ATTRIBUTE]: DROP_KIND_PIECE,
    [DROP_SIDE_ATTRIBUTE]: side,
  }
}

/** 架子整片都是一個落點。它不分邊，也沒有位置可言。 */
export const SHELF_DROP_MARKUP = { [DROP_KIND_ATTRIBUTE]: DROP_KIND_SHELF }

function isConditionSide(value: string | undefined): value is ConditionSideVo {
  return CONDITION_SIDES.some(side => side === value)
}

function isDragOrigin(value: string | undefined): value is PieceDragOrigin {
  return value === 'shelf' || isConditionSide(value)
}

/**
 * 一個被按住的元素讀成「拿起了哪一塊、從哪裡拿的」。
 *
 * 讀不出來就回 `null`，而不是猜一個：一塊說不出自己是誰的零件，放到哪裡都是錯的，
 * 而錯放比拖不動更難發現。
 */
export function pickedUpPieceOf(element: Element) {
  const sourceLabel = element.getAttribute(PIECE_LABEL_ATTRIBUTE)
  const origin = element.getAttribute(PIECE_ORIGIN_ATTRIBUTE) ?? undefined

  if (sourceLabel === null || sourceLabel === '' || !isDragOrigin(origin)) {
    return null
  }

  return { sourceLabel, origin }
}

/**
 * 指標移到一個落點上：只有插入帶說得出「懸在第幾格」，另外兩種沒有位置可言。
 *
 * 這裡與 applyDropOn 收的是**同一個元素**、讀的是**同一組屬性**，所以兩者不會對同一
 * 個落點有不同的看法。
 */
export function applyHoverOn(element: Element, pieceDrag: ReturnType<typeof usePieceDrag>) {
  const side = element.getAttribute(DROP_SIDE_ATTRIBUTE) ?? undefined
  const position = slotPositionOf(element)

  if (element.getAttribute(DROP_KIND_ATTRIBUTE) !== DROP_KIND_SLOT
    || !isConditionSide(side) || position === null) {
    return
  }

  pieceDrag.hoverOver(side, position)
}

/** 放下去。三種落點各自是一種搬動——哪一種由這個元素自己說。 */
export function applyDropOn(element: Element, pieceDrag: ReturnType<typeof usePieceDrag>) {
  const kind = element.getAttribute(DROP_KIND_ATTRIBUTE)

  if (kind === DROP_KIND_SHELF) {
    pieceDrag.dropOnShelf()

    return
  }

  const side = element.getAttribute(DROP_SIDE_ATTRIBUTE) ?? undefined
  if (!isConditionSide(side)) {
    return
  }

  if (kind === DROP_KIND_PIECE) {
    const targetLabel = element.getAttribute(PIECE_LABEL_ATTRIBUTE)
    if (targetLabel !== null && targetLabel !== '') {
      pieceDrag.dropOntoPiece(side, targetLabel)
    }

    return
  }

  const position = slotPositionOf(element)
  if (kind === DROP_KIND_SLOT && position !== null) {
    pieceDrag.dropOnMat(side, position)
  }
}

/**
 * 這條插入帶說的是第幾格。
 *
 * 讀不成一個非負整數就回 `null`。少了這一關，一個拼錯的屬性會讀成 `NaN`，
 * 而 `NaN` 在排序那一段不會爆炸——它會讓零件安靜地掉到最上面那一格。
 * 不動，比動錯地方好。
 */
function slotPositionOf(element: Element): number | null {
  const declared = element.getAttribute(DROP_POSITION_ATTRIBUTE)
  if (declared === null) {
    return null
  }

  const position = Number(declared)

  return Number.isInteger(position) && position >= 0 ? position : null
}
