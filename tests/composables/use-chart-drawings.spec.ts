// @vitest-environment nuxt
import { nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { ChartDrawingApplication } from '~/application/chart-drawing-application'
import { ChartDrawingService } from '~/domain/service/chart-drawing-service'
import type { IChartDrawingPreferenceProxy } from '~/domain/interface/i-chart-drawing-preference-proxy'
import { ChartDrawingCommandDto } from '~/domain/models/dto/chart-drawing-command-dto'
import type { ChartDrawing } from '~/domain/models/entities/chart-drawing'
import type { ChartDrawingKindValue } from '~/domain/models/vo/chart-drawing-kind-vo'
import type { ChartDrawingToolGroupDto } from '~/domain/models/dto/chart-drawing-tool-group-dto'
import { ELEVEN_O_CLOCK, TEN_O_CLOCK, anchorOf, chartDrawingOf } from '../fixtures/chart-drawing'

const HORIZONTAL_LINE = chartDrawingOf(1, 'horizontalLine', [anchorOf(TEN_O_CLOCK, '60000')])

function drawingsUnderTest(storedBySymbol: Record<string, ChartDrawing[]> = { BTCUSDT: [HORIZONTAL_LINE] }) {
  const proxy: IChartDrawingPreferenceProxy = {
    readChartDrawings: vi.fn((_, symbol: string) => storedBySymbol[symbol] ?? []),
    writeChartDrawings: vi.fn(),
  }
  const application = new ChartDrawingApplication(new ChartDrawingService(proxy))
  const symbol = ref('BTCUSDT')

  return { drawings: useChartDrawings(application, 'spot', symbol), application, symbol, proxy }
}

describe('useChartDrawings：選工具', () => {
  it('一開始是十字線游標，沒有繪圖工具', () => {
    const { drawings } = drawingsUnderTest()

    expect(drawings.activeDrawingKind.value).toBeNull()
    expect(drawings.cursorStyle.value).toBe('cross')
  })

  it('展開「線」那一格選垂直線：開始畫垂直線，那一格記住它', () => {
    const { drawings } = drawingsUnderTest()

    drawings.pickTool('verticalLine')

    expect(drawings.activeDrawingKind.value).toBe('verticalLine')
    expect(drawings.rememberedTools.value.lines).toBe('verticalLine')
  })

  it('按那一格的主按鈕用的是它記得的工具；正在用時再按一次回到游標', () => {
    const { drawings } = drawingsUnderTest()
    drawings.pickTool('verticalLine')
    drawings.returnToCursor()

    drawings.pressToolGroup('lines')
    expect(drawings.activeDrawingKind.value).toBe('verticalLine')

    drawings.pressToolGroup('lines')
    expect(drawings.activeDrawingKind.value).toBeNull()
  })

  it('選箭頭游標：回到游標、游標樣式換成箭頭', () => {
    const { drawings } = drawingsUnderTest()
    drawings.pickTool('rectangle')

    drawings.pickTool('arrow')

    expect(drawings.activeDrawingKind.value).toBeNull()
    expect(drawings.cursorStyle.value).toBe('arrow')
  })

  it('⌥H 換成水平線；對不到的鍵什麼都不換', () => {
    const { drawings } = drawingsUnderTest()

    expect(drawings.pickToolByShortcut('KeyH', false)).toBe(true)
    expect(drawings.activeDrawingKind.value).toBe('horizontalLine')
    expect(drawings.pickToolByShortcut('KeyQ', false)).toBe(false)
    expect(drawings.activeDrawingKind.value).toBe('horizontalLine')
  })
})

describe('useChartDrawings：畫完、選取、隱藏', () => {
  it('畫完一個：它被選取、工具回到游標', () => {
    const { drawings, application } = drawingsUnderTest()
    drawings.pickTool('trendLine')

    drawings.finishDrawing(application.draftDrawing('trendLine', [anchorOf(TEN_O_CLOCK, '1'), anchorOf(ELEVEN_O_CLOCK, '2')]))

    expect(drawings.selectedDrawing.value?.kind).toBe('trendLine')
    expect(drawings.activeDrawingKind.value).toBeNull()
  })

  it('開著連續繪圖：畫完一個工具不變', () => {
    const { drawings, application } = drawingsUnderTest()
    drawings.stayInDrawingMode.value = true
    drawings.pickTool('rectangle')

    drawings.finishDrawing(application.draftDrawing('rectangle', [anchorOf(TEN_O_CLOCK, '1'), anchorOf(ELEVEN_O_CLOCK, '2')]))

    expect(drawings.activeDrawingKind.value).toBe('rectangle')
  })

  it('隱藏所有：一個都不畫、選取中的也不算選取；關掉之後回來', () => {
    const { drawings } = drawingsUnderTest()
    drawings.selectDrawing(1)

    drawings.hideAllDrawings.value = true
    expect(drawings.shownDrawings.value).toEqual([])
    expect(drawings.selectedDrawing.value).toBeNull()

    drawings.hideAllDrawings.value = false
    expect(drawings.shownDrawings.value).toHaveLength(1)
  })

  it('自己收起來的那一個不畫', () => {
    const { drawings } = drawingsUnderTest()

    drawings.changeDrawing(1, new ChartDrawingCommandDto('toggleVisible'))

    expect(drawings.shownDrawings.value).toEqual([])
    expect(drawings.board.value.drawings).toHaveLength(1)
  })

  it('選了繪圖工具就取消選取', () => {
    const { drawings } = drawingsUnderTest()
    drawings.selectDrawing(1)

    drawings.pickTool('ray')

    expect(drawings.selectedDrawing.value).toBeNull()
  })
})

describe('useChartDrawings：刪除、移除所有、上一步', () => {
  it('刪除一個之後上一步它回來、下一步又消失', () => {
    const { drawings } = drawingsUnderTest()

    drawings.removeDrawing(1)
    expect(drawings.board.value.drawings).toHaveLength(0)

    drawings.undo()
    expect(drawings.board.value.drawings).toHaveLength(1)

    drawings.redo()
    expect(drawings.board.value.drawings).toHaveLength(0)
  })

  it('移除所有交回移除了幾個；沒有可移除的時是零', () => {
    const { drawings } = drawingsUnderTest()

    expect(drawings.removeAllDrawings()).toBe(1)
    expect(drawings.removeAllDrawings()).toBe(0)
  })
})

describe('useChartDrawings：換一檔', () => {
  it('換到 ETHUSDT：帶出那一檔的繪圖、上一步按不了、什麼都沒選取', async () => {
    const { drawings, symbol, proxy } = drawingsUnderTest({ BTCUSDT: [HORIZONTAL_LINE], ETHUSDT: [] })
    drawings.removeDrawing(1)
    drawings.undo()
    drawings.selectDrawing(1)

    symbol.value = 'ETHUSDT'
    await nextTick()

    expect(proxy.readChartDrawings).toHaveBeenLastCalledWith('spot', 'ETHUSDT')
    expect(drawings.board.value.drawings).toEqual([])
    expect(drawings.board.value.canUndo).toBe(false)
    expect(drawings.selectedDrawing.value).toBeNull()
  })
})

describe('useChartDrawings：認不得的工具', () => {
  it('選一個不存在的工具或按一格不存在的主按鈕：什麼都不換', () => {
    const { drawings } = drawingsUnderTest()

    drawings.pickTool('spiral' as ChartDrawingKindValue)
    drawings.pressToolGroup('spirals' as ChartDrawingToolGroupDto['value'])

    expect(drawings.activeDrawingKind.value).toBeNull()
  })
})
