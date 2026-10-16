import Decimal from 'decimal.js'
import { describe, expect, it, vi } from 'vitest'
import { ChartDrawingApplication } from '~/application/chart-drawing-application'
import { ChartDrawingService } from '~/domain/service/chart-drawing-service'
import type { IChartDrawingPreferenceProxy } from '~/domain/interface/i-chart-drawing-preference-proxy'
import { ChartDrawingCommandDto } from '~/domain/models/dto/chart-drawing-command-dto'
import { ELEVEN_O_CLOCK, TEN_O_CLOCK, anchorOf, chartDrawingOf } from '../fixtures/chart-drawing'
import { KCandleSpec, kCandleChartOf } from '../fixtures/k-candle-chart'

function buildProxy(stored = [chartDrawingOf(1, 'horizontalLine', [anchorOf(TEN_O_CLOCK, '60000')])]): IChartDrawingPreferenceProxy {
  return {
    readChartDrawings: vi.fn().mockReturnValue(stored),
    writeChartDrawings: vi.fn(),
  }
}

const applicationOf = (proxy: IChartDrawingPreferenceProxy) => new ChartDrawingApplication(new ChartDrawingService(proxy))

describe('ChartDrawingApplication：帶出、畫、留存', () => {
  it('帶出這一檔的繪圖：讀的是那一邊那一檔，紀錄從頭開始', () => {
    const proxy = buildProxy()
    const board = applicationOf(proxy).loadBoard('contract', 'ETHUSDT')

    expect(proxy.readChartDrawings).toHaveBeenCalledWith('contract', 'ETHUSDT')
    expect(board.drawings).toHaveLength(1)
    expect(board.canUndo).toBe(false)
  })

  it('畫一個新的：用這種繪圖的預設樣式，並寫回那一邊那一檔', () => {
    const proxy = buildProxy()
    const application = applicationOf(proxy)
    const draft = application.draftDrawing('rectangle', [anchorOf(TEN_O_CLOCK, '1'), anchorOf(ELEVEN_O_CLOCK, '2')])

    const board = application.addDrawing(application.loadBoard('spot', 'BTCUSDT'), draft)

    expect(draft.colorToken).toBe('--color-drawing-purple')
    expect(draft.lineWidth).toBe(1)
    expect(board.drawings.map(drawing => drawing.id)).toEqual([1, 2])
    expect(proxy.writeChartDrawings).toHaveBeenLastCalledWith('spot', 'BTCUSDT', expect.arrayContaining([
      expect.objectContaining({ id: 2, kind: 'rectangle' }),
    ]))
  })

  it.each([
    ['上一步', (application: ChartDrawingApplication, board: ReturnType<ChartDrawingApplication['loadBoard']>) =>
      application.undo(application.removeAllDrawings(board)), 1],
    ['下一步', (application: ChartDrawingApplication, board: ReturnType<ChartDrawingApplication['loadBoard']>) =>
      application.redo(application.undo(application.removeAllDrawings(board))), 0],
    ['刪除', (application: ChartDrawingApplication, board: ReturnType<ChartDrawingApplication['loadBoard']>) =>
      application.removeDrawing(board, 1), 0],
    ['修改', (application: ChartDrawingApplication, board: ReturnType<ChartDrawingApplication['loadBoard']>) =>
      application.changeDrawing(board, 1, new ChartDrawingCommandDto('toggleVisible')), 1],
  ])('%s之後寫回的是做完的那一份', (_, act, remaining) => {
    const proxy = buildProxy()
    const application = applicationOf(proxy)

    act(application, application.loadBoard('spot', 'BTCUSDT'))

    expect(vi.mocked(proxy.writeChartDrawings).mock.lastCall?.[2]).toHaveLength(remaining)
  })

  it('拖動途中的預覽不寫回留存', () => {
    const proxy = buildProxy()
    const application = applicationOf(proxy)
    const [drawing] = application.loadBoard('spot', 'BTCUSDT').drawings

    const preview = drawing && application.previewChange(drawing,
      new ChartDrawingCommandDto('replaceAnchors', [anchorOf(TEN_O_CLOCK, '61000')]))

    expect(preview?.anchors[0]?.price.toString()).toBe('61000')
    expect(proxy.writeChartDrawings).not.toHaveBeenCalled()
  })
})

describe('ChartDrawingApplication：放到圖上', () => {
  const chart = kCandleChartOf('1h', [
    new KCandleSpec(TEN_O_CLOCK, '100', '105', '99', '103'),
    new KCandleSpec(ELEVEN_O_CLOCK),
  ])

  it('對齊錨點：時間對齊到那一根、開著磁鐵吸到最近的價', () => {
    const anchor = applicationOf(buildProxy()).alignAnchor(chart, 0.2, new Decimal('104.8'), true)

    expect(anchor.openTime).toEqual(new Date(TEN_O_CLOCK))
    expect(anchor.price.toString()).toBe('105')
  })

  it('一點的繪圖放到圖上：錨點換成第幾根', () => {
    const application = applicationOf(buildProxy())
    const board = application.loadBoard('spot', 'BTCUSDT')

    expect(application.placeDrawings(chart, board.drawings)[0]?.anchors[0]?.logicalIndex).toBe(0)
  })
})

describe('ChartDrawingApplication：工具格與快捷鍵', () => {
  it('五格依序是游標、線、斐波那契、形狀、測量；線那一格有五種', () => {
    const groups = applicationOf(buildProxy()).listToolGroups()

    expect(groups.map(group => group.value)).toEqual(['cursor', 'lines', 'fibonacci', 'shapes', 'measure'])
    expect(groups[0]?.tools.map(tool => tool.value)).toEqual(['cross', 'dot', 'arrow'])
    expect(groups[1]?.tools.map(tool => tool.value))
      .toEqual(['trendLine', 'ray', 'horizontalLine', 'horizontalRay', 'verticalLine'])
    expect(groups[1]?.tools[2]?.shortcutLabel).toBe('⌥H')
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
    expect(applicationOf(buildProxy()).drawingKindForShortcut(keyCode, withShift)).toBe(kind)
  })
})
