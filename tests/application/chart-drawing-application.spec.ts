import Decimal from 'decimal.js'
import { createFetchError, type FetchContext } from 'ofetch'
import { describe, expect, it, vi } from 'vitest'
import { ChartDrawingCommandDto } from '~/domain/models/dto/chart-drawing-command-dto'
import { ChartDrawingStrokePointDto } from '~/domain/models/dto/chart-drawing-stroke-point-dto'
import { ChartDrawing } from '~/domain/models/entities/chart-drawing'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { ChartDrawingBoardChangedError } from '~/domain/errors/chart-drawing-board-changed-error'
import {
  ELEVEN_O_CLOCK, TEN_O_CLOCK, anchorOf, chartDrawingOf, horizontalLineAt, savedBoardOf,
} from '../fixtures/chart-drawing'
import {
  FIRST_ISSUED_DRAWING_ID, buildChartDrawingApplication, chartDrawingBoardProxyOf, deviceChartDrawingProxyOf,
} from '../fixtures/chart-drawing-application'
import { KCandleSpec, kCandleChartOf } from '../fixtures/k-candle-chart'

const unreachable = () => new BackendUnreachableError('http://localhost:8080', {
  cause: createFetchError({ request: 'x', options: {} } as unknown as FetchContext),
})

describe('ChartDrawingApplication：讀帳號那一份', () => {
  it('讀的是那一邊那一檔；沒有舊繪圖要搬', async () => {
    const boardProxy = chartDrawingBoardProxyOf(savedBoardOf(3, [horizontalLineAt(7, '60000')], 'contract', 'ETHUSDT'))
    const deviceProxy = deviceChartDrawingProxyOf()

    const loaded = await buildChartDrawingApplication(boardProxy, deviceProxy).loadSavedBoard('contract', 'ETHUSDT')

    expect(boardProxy.fetchBoard).toHaveBeenCalledWith('contract', 'ETHUSDT')
    expect(loaded.savedBoard.revision).toBe(3)
    expect(loaded.savedBoard.drawings.map(drawing => drawing.id)).toEqual([7])
    expect(loaded.migratedDrawingCount).toBe(0)
    expect(deviceProxy.readChartDrawings).not.toHaveBeenCalled()
  })

  it('帳號從沒存過、這台裝置有 3 個舊繪圖：搬進帳號（當成新的手畫繪圖）並忘掉舊紀錄', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    const deviceProxy = deviceChartDrawingProxyOf([horizontalLineAt(1, '1'), horizontalLineAt(2, '2'), horizontalLineAt(3, '3')])

    const loaded = await buildChartDrawingApplication(boardProxy, deviceProxy).loadSavedBoard('spot', 'BTCUSDT')

    expect(deviceProxy.readChartDrawings).toHaveBeenCalledWith('spot', 'BTCUSDT')
    expect(vi.mocked(boardProxy.saveBoard).mock.lastCall?.[0].revision).toBe(0)
    expect(vi.mocked(boardProxy.saveBoard).mock.lastCall?.[0].drawings.map(drawing => drawing.id)).toEqual([0, 0, 0])
    expect(loaded.savedBoard.drawings.map(drawing => drawing.source)).toEqual(['manual', 'manual', 'manual'])
    expect(loaded.migratedDrawingCount).toBe(3)
    expect(loaded.migrationFailure).toBeNull()
    expect(deviceProxy.forgetChartDrawings).toHaveBeenCalledWith('spot', 'BTCUSDT')
  })

  it.each([
    ['帳號裡已經有東西', savedBoardOf(5, [horizontalLineAt(7, '60000')])],
    ['帳號曾經存過、現在是空的', savedBoardOf(4, [])],
  ])('%s：不搬，舊紀錄照樣留著', async (_, storedBoard) => {
    const boardProxy = chartDrawingBoardProxyOf(storedBoard)
    const deviceProxy = deviceChartDrawingProxyOf([horizontalLineAt(1, '1')])

    const loaded = await buildChartDrawingApplication(boardProxy, deviceProxy).loadSavedBoard('spot', 'BTCUSDT')

    expect(boardProxy.saveBoard).not.toHaveBeenCalled()
    expect(deviceProxy.forgetChartDrawings).not.toHaveBeenCalled()
    expect(loaded.migratedDrawingCount).toBe(0)
  })

  it('這台裝置只有合約那一檔的舊繪圖：打開現貨那一檔不搬任何東西', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    const deviceProxy = deviceChartDrawingProxyOf()
    vi.mocked(deviceProxy.readChartDrawings).mockImplementation(marketSide =>
      marketSide === 'contract' ? [horizontalLineAt(1, '1')] : [])

    const loaded = await buildChartDrawingApplication(boardProxy, deviceProxy).loadSavedBoard('spot', 'BTCUSDT')

    expect(deviceProxy.readChartDrawings).toHaveBeenCalledWith('spot', 'BTCUSDT')
    expect(boardProxy.saveBoard).not.toHaveBeenCalled()
    expect(loaded.savedBoard.drawings).toEqual([])
    expect(loaded.migratedDrawingCount).toBe(0)
  })

  it('搬的那一次連不上：交回讀到的那一份與原因，舊紀錄留著', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    vi.mocked(boardProxy.saveBoard).mockRejectedValue(unreachable())
    const deviceProxy = deviceChartDrawingProxyOf([horizontalLineAt(1, '1')])

    const loaded = await buildChartDrawingApplication(boardProxy, deviceProxy).loadSavedBoard('spot', 'BTCUSDT')

    expect(loaded.savedBoard.drawings).toEqual([])
    expect(loaded.migratedDrawingCount).toBe(0)
    expect(loaded.migrationFailure).not.toBeNull()
    expect(deviceProxy.forgetChartDrawings).not.toHaveBeenCalled()
  })

  it('搬的時候出了說不出原因的錯：往上拋，不當成沒搬成', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    vi.mocked(boardProxy.saveBoard).mockRejectedValue(new TypeError('bug'))

    await expect(buildChartDrawingApplication(boardProxy, deviceChartDrawingProxyOf([horizontalLineAt(1, '1')]))
      .loadSavedBoard('spot', 'BTCUSDT')).rejects.toBeInstanceOf(TypeError)
  })

  it('讀不到：往上拋，讓畫面說明', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    vi.mocked(boardProxy.fetchBoard).mockRejectedValue(unreachable())

    await expect(buildChartDrawingApplication(boardProxy).loadSavedBoard('spot', 'BTCUSDT'))
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })
})

describe('ChartDrawingApplication：畫、存回', () => {
  it('畫一個新的：用這種繪圖的預設樣式，還沒存進去', () => {
    const application = buildChartDrawingApplication()
    const draft = application.draftDrawing('rectangle', [anchorOf(TEN_O_CLOCK, '1'), anchorOf(ELEVEN_O_CLOCK, '2')])

    const board = application.addDrawing(application.openBoard('spot', 'BTCUSDT'), draft)

    expect(draft.colorToken).toBe('--color-drawing-purple')
    expect(draft.lineWidth).toBe(1)
    expect(board.hasUnsavedChanges).toBe(true)
  })

  it('存回：送出的是根據帳號版本的整份；存進去後換成帳號發的編號', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    const application = buildChartDrawingApplication(boardProxy)
    const board = application.addDrawing(application.openBoard('spot', 'BTCUSDT'),
      application.draftDrawing('horizontalLine', [anchorOf(TEN_O_CLOCK, '60000')]))

    const result = await application.saveBoard(board)
    const acknowledged = application.settleSave(board, board, result)

    expect(vi.mocked(boardProxy.saveBoard).mock.lastCall?.[0].revision).toBe(0)
    expect(result.outcome).toBe('saved')
    expect(acknowledged.drawings.map(drawing => drawing.id)).toEqual([FIRST_ISSUED_DRAWING_ID])
    expect(acknowledged.hasUnsavedChanges).toBe(false)
  })

  it('帳號那一份已在別處改過：交回現在那一份，接上之後兩邊的都在', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    vi.mocked(boardProxy.saveBoard).mockRejectedValue(new ChartDrawingBoardChangedError('changed',
      savedBoardOf(1, [horizontalLineAt(9, '58000', 'assistant')])))
    const application = buildChartDrawingApplication(boardProxy)
    const board = application.addDrawing(application.openBoard('spot', 'BTCUSDT'),
      application.draftDrawing('horizontalLine', [anchorOf(TEN_O_CLOCK, '60000')]))

    const result = await application.saveBoard(board)
    const incorporated = application.settleSave(board, board, result)

    expect(result.outcome).toBe('superseded')
    expect(incorporated.drawings.map(drawing => drawing.id)).toEqual([-1, 9])
    expect(incorporated.assistantDrawingCount).toBe(1)
  })

  it('存不進去：往上拋', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    vi.mocked(boardProxy.saveBoard).mockRejectedValue(unreachable())
    const application = buildChartDrawingApplication(boardProxy)
    const board = application.addDrawing(application.openBoard('spot', 'BTCUSDT'),
      application.draftDrawing('horizontalLine', [anchorOf(TEN_O_CLOCK, '60000')]))

    await expect(application.saveBoard(board)).rejects.toBeInstanceOf(BackendUnreachableError)
  })

  it('移除助手畫的全部：打那一邊那一檔，交回移除了幾個', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    vi.mocked(boardProxy.removeAssistantDrawings).mockResolvedValue(2)

    expect(await buildChartDrawingApplication(boardProxy).removeAssistantDrawings('contract', 'ETHUSDT')).toBe(2)
    expect(boardProxy.removeAssistantDrawings).toHaveBeenCalledWith('contract', 'ETHUSDT')
  })

  it('拖動途中的預覽不算一步', () => {
    const application = buildChartDrawingApplication()
    const drawing = chartDrawingOf(1, 'horizontalLine', [anchorOf(TEN_O_CLOCK, '60000')]).toDomain().toDto()

    const preview = application.previewChange(drawing,
      new ChartDrawingCommandDto('replaceAnchors', [anchorOf(TEN_O_CLOCK, '61000')]))

    expect(preview.anchors[0]?.price.toString()).toBe('61000')
  })
})

describe('ChartDrawingApplication：放到圖上', () => {
  const chart = kCandleChartOf('1h', [
    new KCandleSpec(TEN_O_CLOCK, '100', '105', '99', '103'),
    new KCandleSpec(ELEVEN_O_CLOCK),
  ])

  it('對齊錨點：時間對齊到那一根、開著磁鐵吸到最近的價', () => {
    const anchor = buildChartDrawingApplication().alignAnchor(chart, 0.2, new Decimal('104.8'), true)

    expect(anchor.openTime).toEqual(new Date(TEN_O_CLOCK))
    expect(anchor.price.toString()).toBe('105')
  })

  it('斐波那契回撤照固定的配色畫：帳號裡記著哪個顏色都一樣', () => {
    const application = buildChartDrawingApplication()
    const levelColorsOf = (colorToken: string) => application.placeDrawings(chart, [
      new ChartDrawing(9, 'fibonacciRetracement', [anchorOf(TEN_O_CLOCK, '100'), anchorOf(ELEVEN_O_CLOCK, '200')],
        colorToken, 1, 'solid', false, true).toDomain().toDto(),
    ])[0]?.fibonacciLevels.map(level => level.colorToken)

    expect(levelColorsOf('--color-drawing-red')).toEqual(levelColorsOf('--color-drawing-teal'))
    expect(new Set(levelColorsOf('--color-drawing-red')).size).toBeGreaterThan(1)
  })

  it('一點的繪圖放到圖上：錨點換成第幾根', () => {
    const application = buildChartDrawingApplication()
    const board = application.addDrawing(application.openBoard('spot', 'BTCUSDT'),
      application.draftDrawing('horizontalLine', [anchorOf(TEN_O_CLOCK, '60000')]))

    expect(application.placeDrawings(chart, board.drawings)[0]?.anchors[0]?.logicalIndex).toBe(0)
  })
})

describe('ChartDrawingApplication：工具格與快捷鍵', () => {
  it('六格依序是游標、線、斐波那契、形狀、奇異筆、測量；線那一格有五種', () => {
    const groups = buildChartDrawingApplication().listToolGroups()

    expect(groups.map(group => group.value)).toEqual(['cursor', 'lines', 'fibonacci', 'shapes', 'brush', 'measure'])
    expect(groups[0]?.tools.map(tool => tool.value)).toEqual(['cross', 'dot', 'arrow'])
    expect(groups[1]?.tools.map(tool => tool.value))
      .toEqual(['trendLine', 'ray', 'horizontalLine', 'horizontalRay', 'verticalLine'])
    expect(groups[1]?.tools[2]?.shortcutLabel).toBe('⌥H')
  })

  it('奇異筆自己一格，沒有快捷鍵', () => {
    const brushGroup = buildChartDrawingApplication().listToolGroups().find(group => group.value === 'brush')

    expect(brushGroup?.tools.map(tool => [tool.value, tool.label.traditionalChinese, tool.shortcutLabel]))
      .toEqual([['brush', '奇異筆', null]])
  })

  it.each([
    ['KeyT', false, 'trendLine'],
    ['KeyH', false, 'horizontalLine'],
    ['KeyJ', false, 'horizontalRay'],
    ['KeyV', false, 'verticalLine'],
    ['KeyF', false, 'fibonacciRetracement'],
    ['KeyR', true, 'rectangle'],
    ['KeyR', false, null],
    ['KeyQ', false, null],
  ])('⌥ + %s（shift %s）對到 %s', (keyCode, withShift, kind) => {
    expect(buildChartDrawingApplication().drawingKindForShortcut(keyCode, withShift)).toBe(kind)
  })
})

describe('ChartDrawingApplication：奇異筆的草稿', () => {
  /** 三根一小時 K 線：10:00、11:00、12:00。 */
  const chart = kCandleChartOf('1h', [
    new KCandleSpec('2026-10-16T10:00:00.000Z'),
    new KCandleSpec('2026-10-16T11:00:00.000Z'),
    new KCandleSpec('2026-10-16T12:00:00.000Z'),
  ])
  const pointAt = (x: number, y: number, logicalIndex: number, price: string) =>
    new ChartDrawingStrokePointDto(x, y, logicalIndex, new Decimal(price))

  it('一筆從第 0.25 根拉到第 1.5 根：橘色、線寬 2、實線，點落在那一刻與那個價格', () => {
    const drawing = buildChartDrawingApplication().draftFreehandDrawing(chart, 'brush', [
      pointAt(0, 0, 0.25, '100.5'),
      pointAt(50, 40, 1.5, '96.25'),
    ])

    expect(drawing.kind).toBe('brush')
    expect(drawing.colorToken).toBe('--color-drawing-orange')
    expect(drawing.lineWidth).toBe(2)
    expect(drawing.lineStyle).toBe('solid')
    expect(drawing.anchors.map(anchor => [anchor.openTime.toISOString(), anchor.price.toString()]))
      .toEqual([['2026-10-16T10:15:00.000Z', '100.5'], ['2026-10-16T11:30:00.000Z', '96.25']])
  })

  it('按下沒有移動：只有一個點，還不算一個繪圖', () => {
    const drawing = buildChartDrawingApplication().draftFreehandDrawing(chart, 'brush', [
      pointAt(20, 20, 0.5, '100'), pointAt(20, 20, 0.5, '100'),
    ])

    expect(drawing.anchors).toHaveLength(1)
  })

  it('畫好的奇異筆收進板子、存回時照原樣送出', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    const application = buildChartDrawingApplication(boardProxy)
    const drawing = application.draftFreehandDrawing(chart, 'brush', [pointAt(0, 0, 0.25, '100'), pointAt(50, 40, 1.5, '96')])

    await application.saveBoard(application.addDrawing(application.openBoard('spot', 'BTCUSDT'), drawing))

    const sent = vi.mocked(boardProxy.saveBoard).mock.lastCall?.[0].drawings[0]
    expect(sent?.kind).toBe('brush')
    expect(sent?.anchors.map(anchor => anchor.openTime.toISOString()))
      .toEqual(['2026-10-16T10:15:00.000Z', '2026-10-16T11:30:00.000Z'])
  })
})

describe('ChartDrawingApplication：整個繪圖平移', () => {
  it('一筆奇異筆往右平移兩根：每一點保留它在那一根裡的那一刻，價格照給的', () => {
    const chart = kCandleChartOf('1h', [
      new KCandleSpec('2026-10-16T10:00:00.000Z'),
      new KCandleSpec('2026-10-16T11:00:00.000Z'),
    ])

    const shifted = buildChartDrawingApplication().shiftAnchors(chart, [
      anchorOf('2026-10-16T10:15:00.000Z', '100'),
      anchorOf('2026-10-16T11:40:00.000Z', '105.5'),
    ], 2)

    expect(shifted.map(anchor => [anchor.openTime.toISOString(), anchor.price.toString()]))
      .toEqual([['2026-10-16T12:15:00.000Z', '100'], ['2026-10-16T13:40:00.000Z', '105.5']])
  })
})
