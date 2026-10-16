import { describe, expect, it } from 'vitest'
import { CHART_DRAWING_HISTORY_LIMIT, ChartDrawingBoardDomain } from '~/domain/models/domains/chart-drawing-board-domain'
import { ChartDrawingCommandDto } from '~/domain/models/dto/chart-drawing-command-dto'
import { ELEVEN_O_CLOCK, TEN_O_CLOCK, anchorOf, chartDrawingOf } from '../../../fixtures/chart-drawing'

const emptyBoard = () => new ChartDrawingBoardDomain('spot', 'BTCUSDT', [], [], [])
const horizontalLine = () => chartDrawingOf(0, 'horizontalLine', [anchorOf(TEN_O_CLOCK, '60000')]).toDomain()

describe('ChartDrawingBoardDomain：上一步與下一步', () => {
  it('畫一條：板上有一條、可以上一步、不能下一步', () => {
    const board = emptyBoard().added(horizontalLine()).toDto()

    expect(board.drawings).toHaveLength(1)
    expect(board.canUndo).toBe(true)
    expect(board.canRedo).toBe(false)
  })

  it('新畫的那一個拿到這一檔還沒用過的號碼', () => {
    const board = emptyBoard().added(horizontalLine()).added(horizontalLine()).toDto()

    expect(board.drawings.map(drawing => drawing.id)).toEqual([1, 2])
  })

  it('上一步：剛畫的那條消失、可以下一步', () => {
    const board = emptyBoard().added(horizontalLine()).undone().toDto()

    expect(board.drawings).toHaveLength(0)
    expect(board.canRedo).toBe(true)
  })

  it('下一步：那條回來', () => {
    const board = emptyBoard().added(horizontalLine()).undone().redone().toDto()

    expect(board.drawings).toHaveLength(1)
    expect(board.canRedo).toBe(false)
  })

  it('上一步之後又畫了一個：不能下一步', () => {
    const board = emptyBoard().added(horizontalLine()).undone().added(horizontalLine()).toDto()

    expect(board.canRedo).toBe(false)
  })

  it('沒有可退或可進的步時什麼都不變', () => {
    const board = emptyBoard()

    expect(board.undone()).toBe(board)
    expect(board.redone()).toBe(board)
  })

  it(`最多記 ${CHART_DRAWING_HISTORY_LIMIT} 步：畫 ${CHART_DRAWING_HISTORY_LIMIT + 1} 個之後只退得回 ${CHART_DRAWING_HISTORY_LIMIT} 步`, () => {
    let board = emptyBoard()
    for (let step = 0; step <= CHART_DRAWING_HISTORY_LIMIT; step += 1) {
      board = board.added(horizontalLine())
    }
    for (let step = 0; step < CHART_DRAWING_HISTORY_LIMIT; step += 1) {
      board = board.undone()
    }

    expect(board.toDto().drawings).toHaveLength(1)
    expect(board.toDto().canUndo).toBe(false)
  })
})

describe('ChartDrawingBoardDomain：移除與修改', () => {
  const fiveDrawings = () => Array.from({ length: 5 }).reduce<ChartDrawingBoardDomain>(
    board => board.added(horizontalLine()), emptyBoard())

  it('移除所有：五個都消失；上一步之後五個都回來', () => {
    const cleared = fiveDrawings().removedAll()

    expect(cleared.toDto().drawings).toHaveLength(0)
    expect(cleared.undone().toDto().drawings).toHaveLength(5)
  })

  it('一個都沒有時移除所有：不多一步', () => {
    const board = emptyBoard()

    expect(board.removedAll()).toBe(board)
  })

  it('刪除一個：只有那一個消失', () => {
    const board = fiveDrawings().removed(3).toDto()

    expect(board.drawings.map(drawing => drawing.id)).toEqual([1, 2, 4, 5])
  })

  it('刪除一個不存在的：不多一步', () => {
    const board = fiveDrawings()

    expect(board.removed(99)).toBe(board)
  })

  it('改一個：記一步', () => {
    const board = emptyBoard().added(horizontalLine())
    const changed = board.changed(1, new ChartDrawingCommandDto('cycleLineWidth'))

    expect(changed.toDto().drawings[0]?.lineWidth).toBe(2)
    expect(changed.undone().toDto().drawings[0]?.lineWidth).toBe(1)
  })

  it('改了等於沒改（鎖定的拖不動）：不多一步', () => {
    const board = emptyBoard().added(horizontalLine()).changed(1, new ChartDrawingCommandDto('toggleLocked'))

    expect(board.changed(1, new ChartDrawingCommandDto('replaceAnchors', [anchorOf(ELEVEN_O_CLOCK, '1')]))).toBe(board)
  })
})

describe('ChartDrawingBoardDomain：改一個不存在的', () => {
  it('不多一步', () => {
    const board = emptyBoard().added(horizontalLine())

    expect(board.changed(99, new ChartDrawingCommandDto('toggleLocked'))).toBe(board)
  })
})
