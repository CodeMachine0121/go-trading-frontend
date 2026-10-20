import { describe, expect, it } from 'vitest'
import { CHART_DRAWING_HISTORY_LIMIT, ChartDrawingBoardDomain } from '~/domain/models/domains/chart-drawing-board-domain'
import { ChartDrawingCommandDto } from '~/domain/models/dto/chart-drawing-command-dto'
import { ELEVEN_O_CLOCK, TEN_O_CLOCK, anchorOf, chartDrawingOf, horizontalLineAt, savedBoardOf } from '../../../fixtures/chart-drawing'

const emptyBoard = () => new ChartDrawingBoardDomain(savedBoardOf(0, []), [], [], [])
const horizontalLine = () => chartDrawingOf(0, 'horizontalLine', [anchorOf(TEN_O_CLOCK, '60000')]).toDomain()

describe('ChartDrawingBoardDomain：上一步與下一步', () => {
  it('畫一條：板上有一條、可以上一步、不能下一步', () => {
    const board = emptyBoard().added(horizontalLine()).toDto()

    expect(board.drawings).toHaveLength(1)
    expect(board.canUndo).toBe(true)
    expect(board.canRedo).toBe(false)
  })

  it('還沒存進帳號的新繪圖拿負的暫時編號，不會撞到帳號發的編號', () => {
    const board = new ChartDrawingBoardDomain(savedBoardOf(3, [horizontalLineAt(7, '1')]),
      [horizontalLineAt(7, '1').toDomain()], [], [])
      .added(horizontalLine()).added(horizontalLine()).toDto()

    expect(board.drawings.map(drawing => drawing.id)).toEqual([7, -1, -2])
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
    const board = fiveDrawings().removed(-3).toDto()

    expect(board.drawings.map(drawing => drawing.id)).toEqual([-1, -2, -4, -5])
  })

  it('刪除一個不存在的：不多一步', () => {
    const board = fiveDrawings()

    expect(board.removed(99)).toBe(board)
  })

  it('改一個：記一步', () => {
    const board = emptyBoard().added(horizontalLine())
    const changed = board.changed(-1, new ChartDrawingCommandDto('cycleLineWidth'))

    expect(changed.toDto().drawings[0]?.lineWidth).toBe(2)
    expect(changed.undone().toDto().drawings[0]?.lineWidth).toBe(1)
  })

  it('改了等於沒改（鎖定的拖不動）：不多一步', () => {
    const board = emptyBoard().added(horizontalLine()).changed(-1, new ChartDrawingCommandDto('toggleLocked'))

    expect(board.changed(-1, new ChartDrawingCommandDto('replaceAnchors', [anchorOf(ELEVEN_O_CLOCK, '1')]))).toBe(board)
  })
})

describe('ChartDrawingBoardDomain：改一個不存在的', () => {
  it('不多一步', () => {
    const board = emptyBoard().added(horizontalLine())

    expect(board.changed(99, new ChartDrawingCommandDto('toggleLocked'))).toBe(board)
  })
})

describe('ChartDrawingBoardDomain：換成一模一樣的錨點', () => {
  it('不多一步——點一下沒拖只是選取', () => {
    const board = emptyBoard().added(horizontalLine())

    expect(board.changed(-1, new ChartDrawingCommandDto('replaceAnchors', [anchorOf(TEN_O_CLOCK, '60000')]))).toBe(board)
  })
})

const boardShowing = (revision: number, drawings: ReturnType<typeof horizontalLineAt>[]) =>
  new ChartDrawingBoardDomain(savedBoardOf(revision, drawings), drawings.map(drawing => drawing.toDomain()), [], [])

const pricesOf = (board: ChartDrawingBoardDomain) =>
  board.toDto().drawings.map(drawing => `${drawing.id}@${drawing.anchors[0]?.price.toString()}`)

describe('ChartDrawingBoardDomain：還沒存進帳號的改動', () => {
  it.each([
    ['和帳號那一份一樣', boardShowing(2, [horizontalLineAt(1, '60000')]), false],
    ['新畫了一個', boardShowing(2, [horizontalLineAt(1, '60000')]).added(horizontalLine()), true],
    ['刪了一個', boardShowing(2, [horizontalLineAt(1, '60000')]).removed(1), true],
    ['改了一個', boardShowing(2, [horizontalLineAt(1, '60000')]).changed(1, new ChartDrawingCommandDto('toggleLocked')), true],
    ['改了又上一步', boardShowing(2, [horizontalLineAt(1, '60000')])
      .changed(1, new ChartDrawingCommandDto('toggleLocked')).undone(), false],
  ])('%s：還沒存進去的改動 %s', (_, board, expected) => {
    expect(board.toDto().hasUnsavedChanges).toBe(expected)
  })

  it('數出幾個是助手畫的', () => {
    const board = boardShowing(1, [horizontalLineAt(1, '1', 'assistant'), horizontalLineAt(2, '2'), horizontalLineAt(3, '3', 'assistant')])

    expect(board.toDto().assistantDrawingCount).toBe(2)
  })
})

describe('ChartDrawingBoardDomain：存進帳號之後', () => {
  it('新繪圖換成帳號發的編號，上一步裡的同一個也換；記下換了哪些', () => {
    const drawn = boardShowing(0, []).added(horizontalLine())
    const sent = drawn.currentDrawings()

    const acknowledged = drawn.acknowledged(sent, savedBoardOf(1, [horizontalLineAt(101, '60000')]))
    const board = acknowledged.toDto()

    expect(board.drawings.map(drawing => drawing.id)).toEqual([101])
    expect(board.hasUnsavedChanges).toBe(false)
    expect(board.savedBoard.revision).toBe(1)
    expect([...board.renumberedDrawingIds]).toEqual([[-1, 101]])
    expect(board.canUndo).toBe(true)
    expect(acknowledged.undone().redone().toDto().drawings.map(drawing => drawing.id)).toEqual([101])
  })

  it('來源以帳號記的為準：助手畫的被移動之後仍是助手畫的', () => {
    const moved = boardShowing(4, [horizontalLineAt(7, '60000', 'assistant')])
      .changed(7, new ChartDrawingCommandDto('replaceAnchors', [anchorOf(TEN_O_CLOCK, '61000')]))

    const board = moved.acknowledged(moved.currentDrawings(),
      savedBoardOf(5, [horizontalLineAt(7, '61000', 'assistant')])).toDto()

    expect(board.drawings[0]?.drawnByAssistant).toBe(true)
    expect(board.hasUnsavedChanges).toBe(false)
  })

  it('存回途中又做的改動留著，仍算還沒存進去', () => {
    const drawn = boardShowing(0, []).added(horizontalLine())
    const sent = drawn.currentDrawings()
    const changedMeanwhile = drawn.changed(-1, new ChartDrawingCommandDto('toggleLocked'))

    const board = changedMeanwhile.acknowledged(sent, savedBoardOf(1, [horizontalLineAt(101, '60000')])).toDto()

    expect(board.drawings[0]?.id).toBe(101)
    expect(board.drawings[0]?.locked).toBe(true)
    expect(board.hasUnsavedChanges).toBe(true)
  })

  it('帳號回來的數量對不上：整份改用帳號那一份，上一步清空', () => {
    const drawn = boardShowing(0, []).added(horizontalLine())

    const board = drawn.acknowledged(drawn.currentDrawings(),
      savedBoardOf(1, [horizontalLineAt(101, '1'), horizontalLineAt(102, '2')])).toDto()

    expect(board.drawings.map(drawing => drawing.id)).toEqual([101, 102])
    expect(board.canUndo).toBe(false)
  })
})

describe('ChartDrawingBoardDomain：接上帳號裡較新的一份', () => {
  it.each([
    ['一樣舊', 3],
    ['更舊', 2],
  ])('帳號那一份%s：什麼都不動', (_, revision) => {
    const board = boardShowing(3, [horizontalLineAt(1, '60000')]).changed(1, new ChartDrawingCommandDto('toggleLocked'))

    expect(board.incorporated(savedBoardOf(revision, []))).toBe(board)
  })

  it('這裡沒有還沒存的改動：整份換成帳號的，上一步從頭開始', () => {
    const board = boardShowing(3, [horizontalLineAt(1, '60000')]).changed(1, new ChartDrawingCommandDto('toggleLocked'))
    const saved = board.acknowledged(board.currentDrawings(), savedBoardOf(4, [
      chartDrawingOf(1, 'horizontalLine', [anchorOf(TEN_O_CLOCK, '60000')], true)]))

    const incorporated = saved.incorporated(savedBoardOf(5, [
      chartDrawingOf(1, 'horizontalLine', [anchorOf(TEN_O_CLOCK, '60000')], true), horizontalLineAt(2, '58000', 'assistant')]))

    expect(pricesOf(incorporated)).toEqual(['1@60000', '2@58000'])
    expect(incorporated.toDto().canUndo).toBe(false)
    expect(incorporated.toDto().hasUnsavedChanges).toBe(false)
  })

  it('助手剛畫了線、這裡又畫了一個：兩個都留著', () => {
    const drawn = boardShowing(2, [horizontalLineAt(1, '60000')]).added(horizontalLine())

    const incorporated = drawn.incorporated(savedBoardOf(3, [horizontalLineAt(1, '60000'), horizontalLineAt(9, '58000', 'assistant')]))

    expect(pricesOf(incorporated)).toEqual(['1@60000', '-1@60000', '9@58000'])
    expect(incorporated.toDto().hasUnsavedChanges).toBe(true)
    expect(incorporated.toDto().canUndo).toBe(false)
  })

  it('別處刪了 A、這裡移動了 B：A 不在、B 在新位置', () => {
    const moved = boardShowing(2, [horizontalLineAt(1, '60000'), horizontalLineAt(2, '50000')])
      .changed(2, new ChartDrawingCommandDto('replaceAnchors', [anchorOf(TEN_O_CLOCK, '52000')]))

    const incorporated = moved.incorporated(savedBoardOf(3, [horizontalLineAt(2, '50000')]))

    expect(pricesOf(incorporated)).toEqual(['2@52000'])
  })

  it('兩邊都移動了同一條：以這裡為準', () => {
    const moved = boardShowing(2, [horizontalLineAt(1, '60000')])
      .changed(1, new ChartDrawingCommandDto('replaceAnchors', [anchorOf(TEN_O_CLOCK, '62000')]))

    const incorporated = moved.incorporated(savedBoardOf(3, [horizontalLineAt(1, '61000')]))

    expect(pricesOf(incorporated)).toEqual(['1@62000'])
  })

  it('別處移動了這裡沒動的那一條：用帳號的位置', () => {
    const drawn = boardShowing(2, [horizontalLineAt(1, '60000'), horizontalLineAt(2, '50000')])
      .changed(2, new ChartDrawingCommandDto('toggleLocked'))

    const incorporated = drawn.incorporated(savedBoardOf(3, [horizontalLineAt(1, '61000'), horizontalLineAt(2, '50000')]))

    expect(pricesOf(incorporated)).toEqual(['1@61000', '2@50000'])
  })

  it('這裡刪掉的、帳號裡還在：不再出現', () => {
    const removed = boardShowing(2, [horizontalLineAt(1, '60000'), horizontalLineAt(2, '50000')]).removed(1)

    const incorporated = removed.incorporated(savedBoardOf(3, [
      horizontalLineAt(1, '60000'), horizontalLineAt(2, '50000'), horizontalLineAt(3, '40000', 'assistant')]))

    expect(pricesOf(incorporated)).toEqual(['2@50000', '3@40000'])
  })
})
