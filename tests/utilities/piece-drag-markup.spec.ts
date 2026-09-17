// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DROP_ZONE_SELECTOR,
  PIECE_SELECTOR,
  SHELF_DROP_MARKUP,
  applyDropOn,
  applyHoverOn,
  pickedUpPieceOf,
  pieceDragMarkup,
  pieceDropMarkup,
  slotDropMarkup,
} from '~/utilities/piece-drag-markup'

const place = vi.fn()
const takeOff = vi.fn()
const bundleOnto = vi.fn()

function pieceDragUnderTest() {
  return usePieceDrag(place, takeOff, bundleOnto)
}

/** 一個照著這份契約標好的元素，正如元件 v-bind 出來的那樣。 */
function elementWith(markup: Record<string, string>): HTMLElement {
  const element = document.createElement('div')
  for (const [name, value] of Object.entries(markup)) {
    element.setAttribute(name, value)
  }

  return element
}

beforeEach(() => {
  vi.clearAllMocks()
})

// 寫與讀在同一個檔案裡，這幾條驗的就是那件事：元件標出去的東西，
// 手勢那一層讀得回來。兩邊拼法分岔的那一天沒有任何東西會報錯——
// 只會安靜地拖不動，而那正是這一整輪在修的毛病。
describe('piece-drag-markup：標出去的，選擇器認得回來', () => {
  it('一塊零件標好之後，就是 interact.js 認得的「拿得起來的東西」', () => {
    expect(elementWith(pieceDragMarkup('MACD', 'buy')).matches(PIECE_SELECTOR)).toBe(true)
  })

  it('三種落點標好之後，都是 interact.js 認得的「放得下去的地方」', () => {
    expect(elementWith(slotDropMarkup('buy', 0)).matches(DROP_ZONE_SELECTOR)).toBe(true)
    expect(elementWith(pieceDropMarkup('sell')).matches(DROP_ZONE_SELECTOR)).toBe(true)
    expect(elementWith(SHELF_DROP_MARKUP).matches(DROP_ZONE_SELECTOR)).toBe(true)
  })

  it('沒標過的東西兩種都不是——同一頁上的別的元素不會被當成零件', () => {
    const plain = elementWith({ class: '零件' })

    expect(plain.matches(PIECE_SELECTOR)).toBe(false)
    expect(plain.matches(DROP_ZONE_SELECTOR)).toBe(false)
  })
})

describe('piece-drag-markup：讀出被按住的是哪一塊', () => {
  it('讀得出它是誰、從哪裡被拿起來', () => {
    expect(pickedUpPieceOf(elementWith(pieceDragMarkup('MACD', 'shelf'))))
      .toEqual({ sourceLabel: 'MACD', origin: 'shelf' })
    expect(pickedUpPieceOf(elementWith(pieceDragMarkup('ATR', 'sell'))))
      .toEqual({ sourceLabel: 'ATR', origin: 'sell' })
  })

  it('說不出自己是誰的，讀不出來就是讀不出來', () => {
    // 猜一個比讀不出來更糟：一塊放錯地方的零件比一塊拖不動的難發現得多。
    expect(pickedUpPieceOf(elementWith({ 'data-piece-origin': 'buy' }))).toBeNull()
    expect(pickedUpPieceOf(elementWith({ 'data-piece-label': '' }))).toBeNull()
  })

  it('來歷不是那三種之一的，也讀不出來', () => {
    expect(pickedUpPieceOf(elementWith({
      'data-piece-label': 'MACD',
      'data-piece-origin': '別的地方',
    }))).toBeNull()
    expect(pickedUpPieceOf(elementWith({ 'data-piece-label': 'MACD' }))).toBeNull()
  })
})

describe('piece-drag-markup：放到一個落點上是哪一種搬動', () => {
  it('插入帶＝擺到這一邊的第幾格', () => {
    const pieceDrag = pieceDragUnderTest()
    pieceDrag.pickUp('MACD', 'shelf')

    applyDropOn(elementWith(slotDropMarkup('sell', 3)), pieceDrag)

    expect(place).toHaveBeenCalledWith('sell', 'MACD', 3)
  })

  it('另一塊零件＝疊上去扣成一組，扣到的是那一塊自己的代號', () => {
    const pieceDrag = pieceDragUnderTest()
    pieceDrag.pickUp('ATR', 'buy')

    // 擺著的零件同時是落點：兩份標記疊在同一個元素上，正如墊子畫出來的那樣。
    applyDropOn(
      elementWith({ ...pieceDragMarkup('MACD', 'buy'), ...pieceDropMarkup('buy') }), pieceDrag)

    expect(bundleOnto).toHaveBeenCalledWith('buy', 'ATR', 'MACD')
  })

  it('架子＝從那張墊子上收走', () => {
    const pieceDrag = pieceDragUnderTest()
    pieceDrag.pickUp('MACD', 'buy')

    applyDropOn(elementWith(SHELF_DROP_MARKUP), pieceDrag)

    expect(takeOff).toHaveBeenCalledWith('buy', 'MACD')
  })

  it('標壞了的落點什麼都不做——不動，比動錯地方好', () => {
    const pieceDrag = pieceDragUnderTest()
    pieceDrag.pickUp('MACD', 'shelf')

    // 位置讀不成一個非負整數時，Number() 會給出 NaN，而 NaN 在排序那一段不會爆炸：
    // 它會讓零件安靜地掉到最上面那一格。
    applyDropOn(elementWith({ 'data-drop-kind': 'slot', 'data-drop-side': 'buy' }), pieceDrag)
    applyDropOn(elementWith({
      'data-drop-kind': 'slot',
      'data-drop-side': 'buy',
      'data-drop-position': '第二格',
    }), pieceDrag)
    applyDropOn(elementWith({
      'data-drop-kind': 'slot',
      'data-drop-side': '旁邊',
      'data-drop-position': '1',
    }), pieceDrag)
    // 一塊說不出自己是誰的零件，疊上去也不知道要扣到誰身上。
    applyDropOn(elementWith(pieceDropMarkup('buy')), pieceDrag)
    applyDropOn(elementWith({ 'data-drop-kind': '別種落點' }), pieceDrag)

    expect(place).not.toHaveBeenCalled()
    expect(takeOff).not.toHaveBeenCalled()
    expect(bundleOnto).not.toHaveBeenCalled()
  })
})

describe('piece-drag-markup：懸在一個落點上', () => {
  it('只有插入帶說得出懸在第幾格', () => {
    const pieceDrag = pieceDragUnderTest()
    pieceDrag.pickUp('MACD', 'shelf')

    applyHoverOn(elementWith(slotDropMarkup('buy', 2)), pieceDrag)

    expect(pieceDrag.hoveringOn('buy')).toBe(2)
  })

  it('另外兩種沒有位置可言，懸上去不該讓任何一格亮起來', () => {
    const pieceDrag = pieceDragUnderTest()
    pieceDrag.pickUp('MACD', 'shelf')

    applyHoverOn(elementWith(pieceDropMarkup('buy')), pieceDrag)
    applyHoverOn(elementWith(SHELF_DROP_MARKUP), pieceDrag)

    expect(pieceDrag.hoveringOn('buy')).toBeNull()
  })

  it('懸與放讀的是同一個元素、同一組屬性——兩者不會對同一格有不同看法', () => {
    const pieceDrag = pieceDragUnderTest()
    pieceDrag.pickUp('MACD', 'shelf')
    const slot = elementWith(slotDropMarkup('buy', 1))

    applyHoverOn(slot, pieceDrag)
    expect(pieceDrag.hoveringOn('buy')).toBe(1)

    applyDropOn(slot, pieceDrag)
    expect(place).toHaveBeenCalledWith('buy', 'MACD', 1)
  })
})
