// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'

const place = vi.fn()
const takeOff = vi.fn()
const bundleOnto = vi.fn()

function dragUnderTest() {
  return usePieceDrag(place, takeOff, bundleOnto)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('usePieceDrag：放下去算哪一種搬動', () => {
  it('從架子拖到墊子上＝擺一塊，架子上那一塊還在架子上', () => {
    const drag = dragUnderTest()
    drag.pickUp('MACD', 'shelf')
    drag.dropOnMat('buy', 2)

    expect(place).toHaveBeenCalledWith('buy', 'MACD', 2)
    expect(takeOff).not.toHaveBeenCalled()
  })

  it('從一張墊子拖到另一張＝搬過去，不是複製', () => {
    // 不先從那邊收走的話，同一塊零件會同時掛在兩張墊子上，
    // 而畫面上看起來完全正常。
    const drag = dragUnderTest()
    drag.pickUp('MACD', 'buy')
    drag.dropOnMat('sell', 0)

    expect(takeOff).toHaveBeenCalledWith('buy', 'MACD')
    expect(place).toHaveBeenCalledWith('sell', 'MACD', 0)
  })

  it('在同一張墊子上換位置＝搬位置，不必先收走', () => {
    const drag = dragUnderTest()
    drag.pickUp('MACD', 'buy')
    drag.dropOnMat('buy', 3)

    expect(takeOff).not.toHaveBeenCalled()
    expect(place).toHaveBeenCalledWith('buy', 'MACD', 3)
  })

  it('拖回架子＝從那張墊子上收走', () => {
    const drag = dragUnderTest()
    drag.pickUp('MACD', 'buy')
    drag.dropOnShelf()

    expect(takeOff).toHaveBeenCalledWith('buy', 'MACD')
  })

  it('從架子拿起來又放回架子，什麼都沒發生', () => {
    const drag = dragUnderTest()
    drag.pickUp('MACD', 'shelf')
    drag.dropOnShelf()

    expect(takeOff).not.toHaveBeenCalled()
    expect(place).not.toHaveBeenCalled()
  })

  it('疊到另一塊上＝把兩塊扣成一組', () => {
    const drag = dragUnderTest()
    drag.pickUp('ATR', 'buy')
    drag.dropOntoPiece('buy', 'MACD')

    expect(bundleOnto).toHaveBeenCalledWith('buy', 'ATR', 'MACD')
  })

  it('從別張墊子疊過來的，先搬過來再扣——不然它會同時在兩張墊子上', () => {
    const drag = dragUnderTest()
    drag.pickUp('ATR', 'sell')
    drag.dropOntoPiece('buy', 'MACD')

    expect(takeOff).toHaveBeenCalledWith('sell', 'ATR')
    expect(place).toHaveBeenCalledWith('buy', 'ATR', 0)
    expect(bundleOnto).toHaveBeenCalledWith('buy', 'ATR', 'MACD')
  })

  it('疊到自己身上什麼都不會發生', () => {
    const drag = dragUnderTest()
    drag.pickUp('MACD', 'buy')
    drag.dropOntoPiece('buy', 'MACD')

    expect(bundleOnto).not.toHaveBeenCalled()
  })

  it('手上什麼都沒拿的時候放下去，什麼都不會發生', () => {
    const drag = dragUnderTest()
    drag.dropOnMat('buy', 0)
    drag.dropOntoPiece('buy', 'MACD')
    drag.dropOnShelf()

    expect(place).not.toHaveBeenCalled()
    expect(takeOff).not.toHaveBeenCalled()
    expect(bundleOnto).not.toHaveBeenCalled()
  })

  it('放下去之後手上就空了——一次拿起只搬得動一次', () => {
    const drag = dragUnderTest()
    drag.pickUp('MACD', 'shelf')
    drag.dropOnMat('buy', 0)
    drag.dropOnMat('sell', 0)

    expect(place).toHaveBeenCalledTimes(1)
  })
})

describe('usePieceDrag：手上拿著什麼、懸在哪裡', () => {
  it('拿起來之前，手上是空的、也沒有懸在任何一格上', () => {
    const drag = dragUnderTest()

    expect(drag.carrying.value).toBeNull()
    expect(drag.hoveringOn('buy')).toBeNull()
  })

  it('拿起來之後說得出手上是哪一塊——那條帶子要靠它決定寫什麼', () => {
    const drag = dragUnderTest()
    drag.pickUp('MACD', 'shelf')

    expect(drag.carrying.value).toBe('MACD')
  })

  it('懸在哪一格只對那一張墊子成立，另一張不該跟著亮', () => {
    const drag = dragUnderTest()
    drag.pickUp('MACD', 'shelf')
    drag.hoverOver('buy', 1)

    expect(drag.hoveringOn('buy')).toBe(1)
    expect(drag.hoveringOn('sell')).toBeNull()
  })

  it('手上什麼都沒拿時懸過去不算數——沒拿東西就沒有落點可言', () => {
    const drag = dragUnderTest()
    drag.hoverOver('buy', 1)

    expect(drag.hoveringOn('buy')).toBeNull()
  })

  it('放掉之後兩樣都清掉', () => {
    const drag = dragUnderTest()
    drag.pickUp('MACD', 'shelf')
    drag.hoverOver('buy', 1)
    drag.letGo()

    expect(drag.carrying.value).toBeNull()
    expect(drag.hoveringOn('buy')).toBeNull()
  })
})
