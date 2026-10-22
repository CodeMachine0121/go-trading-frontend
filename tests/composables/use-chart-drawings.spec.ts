// @vitest-environment nuxt
import { effectScope, nextTick, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChartDrawingCommandDto } from '~/domain/models/dto/chart-drawing-command-dto'
import type { ChartDrawingBoard } from '~/domain/models/entities/chart-drawing-board'
import type { ChartDrawingKindValue } from '~/domain/models/vo/chart-drawing-kind-vo'
import type { ChartDrawingToolGroupDto } from '~/domain/models/dto/chart-drawing-tool-group-dto'
import { CHART_DRAWING_SAVE_DELAY_MILLISECONDS } from '~/composables/use-chart-drawing-board-sync'
import { ELEVEN_O_CLOCK, TEN_O_CLOCK, anchorOf, chartDrawingOf, horizontalLineAt, savedBoardOf } from '../fixtures/chart-drawing'
import {
  FIRST_ISSUED_DRAWING_ID, buildChartDrawingApplication, chartDrawingBoardProxyOf,
} from '../fixtures/chart-drawing-application'

const scopes: ReturnType<typeof effectScope>[] = []

afterEach(() => {
  scopes.splice(0).forEach(scope => scope.stop())
  vi.useRealTimers()
})

async function drawingsUnderTest(
  storedBySymbol: Record<string, ChartDrawingBoard> = { BTCUSDT: savedBoardOf(1, [horizontalLineAt(1, '60000')]) },
) {
  const proxy = chartDrawingBoardProxyOf()
  vi.mocked(proxy.fetchBoard).mockImplementation(async (marketSide, symbol) =>
    storedBySymbol[symbol] ?? savedBoardOf(0, [], marketSide, symbol))
  const application = buildChartDrawingApplication(proxy)
  const symbol = ref('BTCUSDT')
  const scope = effectScope()
  scopes.push(scope)
  const drawings = scope.run(() => useChartDrawings(application, 'spot', symbol))!
  await flushPromises()

  return { drawings, application, symbol, proxy }
}

describe('useChartDrawings：選工具', () => {
  it('一開始是十字線游標，沒有繪圖工具', async () => {
    const { drawings } = await drawingsUnderTest()

    expect(drawings.activeDrawingKind.value).toBeNull()
    expect(drawings.cursorStyle.value).toBe('cross')
  })

  it('展開「線」那一格選垂直線：開始畫垂直線，那一格記住它', async () => {
    const { drawings } = await drawingsUnderTest()

    drawings.pickTool('verticalLine')

    expect(drawings.activeDrawingKind.value).toBe('verticalLine')
    expect(drawings.rememberedTools.value.lines).toBe('verticalLine')
  })

  it('按那一格的主按鈕用的是它記得的工具；正在用時再按一次回到游標', async () => {
    const { drawings } = await drawingsUnderTest()
    drawings.pickTool('verticalLine')
    drawings.returnToCursor()

    drawings.pressToolGroup('lines')
    expect(drawings.activeDrawingKind.value).toBe('verticalLine')

    drawings.pressToolGroup('lines')
    expect(drawings.activeDrawingKind.value).toBeNull()
  })

  it('選箭頭游標：回到游標、游標樣式換成箭頭', async () => {
    const { drawings } = await drawingsUnderTest()
    drawings.pickTool('rectangle')

    drawings.pickTool('arrow')

    expect(drawings.activeDrawingKind.value).toBeNull()
    expect(drawings.cursorStyle.value).toBe('arrow')
  })

  it('⌥H 換成水平線；對不到的鍵什麼都不換', async () => {
    const { drawings } = await drawingsUnderTest()

    expect(drawings.pickToolByShortcut('KeyH', false)).toBe(true)
    expect(drawings.activeDrawingKind.value).toBe('horizontalLine')
    expect(drawings.pickToolByShortcut('KeyQ', false)).toBe(false)
    expect(drawings.activeDrawingKind.value).toBe('horizontalLine')
  })
})

describe('useChartDrawings：畫完、選取、隱藏', () => {
  it.each(['trendLine', 'horizontalLine', 'rectangle', 'brush'] as const)('畫完一個%s：它被選取、工具仍是原本選的那一個', async (kind) => {
    const { drawings, application } = await drawingsUnderTest()
    drawings.pickTool(kind)
    const anchors = kind === 'horizontalLine'
      ? [anchorOf(TEN_O_CLOCK, '1')]
      : [anchorOf(TEN_O_CLOCK, '1'), anchorOf(ELEVEN_O_CLOCK, '2')]

    drawings.finishDrawing(application.draftDrawing(kind, anchors))

    expect(drawings.selectedDrawing.value?.kind).toBe(kind)
    expect(drawings.activeDrawingKind.value).toBe(kind)
  })

  it('畫完之後按 Esc：回到游標', async () => {
    const { drawings, application } = await drawingsUnderTest()
    drawings.pickTool('trendLine')
    drawings.finishDrawing(application.draftDrawing('trendLine', [anchorOf(TEN_O_CLOCK, '1'), anchorOf(ELEVEN_O_CLOCK, '2')]))

    drawings.returnToCursor()

    expect(drawings.activeDrawingKind.value).toBeNull()
  })

  it('板上已經 4000 個點時再畫一條：不收、不算一步、提示已達上限，工具不變', async () => {
    const fullBrush = (id: number) => chartDrawingOf(id, 'brush', Array.from({ length: 200 }, (_, index) =>
      anchorOf(new Date(Date.UTC(2026, 9, 16, 10, index)).toISOString(), '100')))
    const { drawings, application } = await drawingsUnderTest({
      BTCUSDT: savedBoardOf(1, Array.from({ length: 20 }, (_, index) => fullBrush(index + 1))),
    })
    drawings.pickTool('trendLine')

    drawings.finishDrawing(application.draftDrawing('trendLine', [anchorOf(TEN_O_CLOCK, '1'), anchorOf(ELEVEN_O_CLOCK, '2')]))

    expect(drawings.board.value.drawings).toHaveLength(20)
    expect(drawings.board.value.canUndo).toBe(false)
    expect(drawings.announcement.value?.traditionalChinese).toBe('這張圖上的繪圖點數已達上限，請先移除一些繪圖')
    expect(drawings.activeDrawingKind.value).toBe('trendLine')
  })

  it('隱藏所有：一個都不畫、選取中的也不算選取；關掉之後回來', async () => {
    const { drawings } = await drawingsUnderTest()
    drawings.selectDrawing(1)

    drawings.hideAllDrawings.value = true
    expect(drawings.shownDrawings.value).toEqual([])
    expect(drawings.selectedDrawing.value).toBeNull()

    drawings.hideAllDrawings.value = false
    expect(drawings.shownDrawings.value).toHaveLength(1)
  })

  it('自己收起來的那一個不畫', async () => {
    const { drawings } = await drawingsUnderTest()

    drawings.changeDrawing(1, new ChartDrawingCommandDto('toggleVisible'))

    expect(drawings.shownDrawings.value).toEqual([])
    expect(drawings.board.value.drawings).toHaveLength(1)
  })

  it('選了繪圖工具就取消選取', async () => {
    const { drawings } = await drawingsUnderTest()
    drawings.selectDrawing(1)

    drawings.pickTool('ray')

    expect(drawings.selectedDrawing.value).toBeNull()
  })
})

describe('useChartDrawings：刪除、移除所有、上一步', () => {
  it('刪除一個之後上一步它回來、下一步又消失', async () => {
    const { drawings } = await drawingsUnderTest()

    drawings.removeDrawing(1)
    expect(drawings.board.value.drawings).toHaveLength(0)

    drawings.undo()
    expect(drawings.board.value.drawings).toHaveLength(1)

    drawings.redo()
    expect(drawings.board.value.drawings).toHaveLength(0)
  })

  it('移除所有交回移除了幾個；沒有可移除的時是零', async () => {
    const { drawings } = await drawingsUnderTest()

    expect(drawings.removeAllDrawings()).toBe(1)
    expect(drawings.removeAllDrawings()).toBe(0)
  })
})

describe('useChartDrawings：換一檔', () => {
  it('換到 ETHUSDT：帶出那一檔的繪圖、上一步按不了、什麼都沒選取', async () => {
    const { drawings, symbol, proxy } = await drawingsUnderTest()
    drawings.removeDrawing(1)
    drawings.undo()
    drawings.selectDrawing(1)

    symbol.value = 'ETHUSDT'
    await nextTick()
    await flushPromises()

    expect(proxy.fetchBoard).toHaveBeenLastCalledWith('spot', 'ETHUSDT')
    expect(drawings.board.value.drawings).toEqual([])
    expect(drawings.board.value.canUndo).toBe(false)
    expect(drawings.selectedDrawing.value).toBeNull()
  })
})

describe('useChartDrawings：認不得的工具', () => {
  it('選一個不存在的工具或按一格不存在的主按鈕：什麼都不換', async () => {
    const { drawings } = await drawingsUnderTest()

    drawings.pickTool('spiral' as ChartDrawingKindValue)
    drawings.pressToolGroup('spirals' as ChartDrawingToolGroupDto['value'])

    expect(drawings.activeDrawingKind.value).toBeNull()
  })
})

describe('useChartDrawings：存回帳號', () => {
  it('畫完一個、存回之後：選取跟著換成帳號發的編號', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { drawings, application } = await drawingsUnderTest()

    drawings.finishDrawing(application.draftDrawing('horizontalLine', [anchorOf(ELEVEN_O_CLOCK, '61000')]))
    expect(drawings.selectedDrawing.value?.id).toBe(-1)

    await vi.advanceTimersByTimeAsync(CHART_DRAWING_SAVE_DELAY_MILLISECONDS)
    await flushPromises()

    expect(drawings.board.value.drawings.map(drawing => drawing.id)).toEqual([1, FIRST_ISSUED_DRAWING_ID])
    expect(drawings.selectedDrawing.value?.id).toBe(FIRST_ISSUED_DRAWING_ID)
  })
})
