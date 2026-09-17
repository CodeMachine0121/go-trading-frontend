import type { ConditionSideVo } from '~/domain/models/vo/condition-side-vo'

/**
 * 一塊零件是從哪裡被拿起來的。
 *
 * 要記著，因為**同一個放下的動作有兩種意思**：從架子上拿的放到墊子上是「擺一塊」，
 * 從墊子上拿的放到另一張墊子是「搬過去」，而放回架子是「拿走」。
 * 只記「拿著什麼」的話，放下的那一刻答不出該做哪一件。
 */
export type PieceDragOrigin = 'shelf' | ConditionSideVo

/**
 * 每個像素都拿得起來：不用瀏覽器內建的拖放，改用指標事件。
 *
 * **為什麼不用瀏覽器內建的那一套**：原生拖曳不會從一個 `<button>` 上起頭，就算它的
 * 祖先標了 `draggable` 也一樣，而且各家瀏覽器對「標了 draggable 的按鈕」的處理並不一致
 * ——Safari 至今幾乎不讓它起頭。一塊零件的下半張臉是三顆信號開關，右上角還有兩顆小按鈕，
 * 於是零件身上被挖出好幾個洞：按在上面往外拉什麼都不會發生。使用者摸到的是一塊
 * 有些地方拖得動、有些拖不動的積木，而他沒有任何辦法看出是哪些地方。
 *
 * 那不是一個補得完的洞——它是那套 API 的性質。所以這裡整個換掉：interact.js 是
 * 純指標事件（mouse / touch / pen）的，它不問被按住的是不是按鈕，也因此順手拿到了觸控。
 * 一起換掉的還有原生拖曳那張改不了的半透明殘影。
 *
 * 按一下仍然是按一下：要走超過 `pointerMoveTolerance` 才算一次拖曳，
 * 沒走就是一次普通的 click，開關照樣切換。
 *
 * **這裡沒有任何業務規則**。它只回答一個問題：手上這一塊，放到那裡去，是三種搬動裡的
 * 哪一種。規則長什麼樣子（一組裡面怎麼合併、哪幾塊算數）住在 ConditionBoardDomain。
 *
 * @param place      把一塊零件擺到某張墊子的第幾格；已經在上面就是搬位置
 * @param takeOff    把一塊零件從某張墊子上拿走（回架子，不是刪掉）
 * @param bundleOnto 把一塊零件扣到另一塊上，變成一組
 */
export function usePieceDrag(
  place: (side: ConditionSideVo, sourceLabel: string, position: number) => void,
  takeOff: (side: ConditionSideVo, sourceLabel: string) => void,
  bundleOnto: (side: ConditionSideVo, sourceLabel: string, targetLabel: string) => void,
) {
  /** 手上拿著的那一塊，以及它是從哪裡拿起來的。 */
  const holding = ref<{ sourceLabel: string, from: PieceDragOrigin } | null>(null)

  /** 現在指標懸在哪一張墊子的哪一格上——那條插入帶就畫在這裡。 */
  const hoveringAt = ref<{ side: ConditionSideVo, position: number } | null>(null)

  /** 這張墊子上正被懸著的那一格；指標不在這一張時為 `null`。 */
  function hoveringOn(side: ConditionSideVo): number | null {
    return hoveringAt.value?.side === side ? hoveringAt.value.position : null
  }

  /** 手上拿著的那一塊的代號。沒拿東西時為 `null`。 */
  const carrying = computed(() => holding.value?.sourceLabel ?? null)

  function pickUp(sourceLabel: string, from: PieceDragOrigin) {
    holding.value = { sourceLabel, from }
  }

  function letGo() {
    holding.value = null
    hoveringAt.value = null
  }

  function hoverOver(side: ConditionSideVo, position: number) {
    if (holding.value !== null) {
      hoveringAt.value = { side, position }
    }
  }

  function leaveHover() {
    hoveringAt.value = null
  }

  /** 放到某張墊子的第幾格。從別張墊子過來的要先從那邊收走，不然它會同時在兩張上。 */
  function dropOnMat(side: ConditionSideVo, position: number) {
    const carried = holding.value
    letGo()
    if (carried === null) {
      return
    }

    if (carried.from !== 'shelf' && carried.from !== side) {
      takeOff(carried.from, carried.sourceLabel)
    }
    place(side, carried.sourceLabel, position)
  }

  /**
   * 把一塊疊到另一塊上＝把它們扣成一組。
   *
   * 這是墊子上唯一造得出巢狀的動作，也是「A 而且（B 或 C）」唯一的寫法。
   */
  function dropOntoPiece(side: ConditionSideVo, targetLabel: string) {
    const carried = holding.value
    letGo()
    if (carried === null || carried.sourceLabel === targetLabel) {
      return
    }

    if (carried.from !== 'shelf' && carried.from !== side) {
      takeOff(carried.from, carried.sourceLabel)
      place(side, carried.sourceLabel, 0)
    }
    bundleOnto(side, carried.sourceLabel, targetLabel)
  }

  /** 放回架子上＝從它原本那張墊子上拿走。從架子拿起來又放回架子是什麼都沒發生。 */
  function dropOnShelf() {
    const carried = holding.value
    letGo()
    if (carried !== null && carried.from !== 'shelf') {
      takeOff(carried.from, carried.sourceLabel)
    }
  }

  return {
    holding,
    hoveringAt,
    carrying,
    hoveringOn,
    pickUp,
    letGo,
    hoverOver,
    leaveHover,
    dropOnMat,
    dropOntoPiece,
    dropOnShelf,
  }
}
