import { vi } from 'vitest'
import { ChartDrawingApplication } from '~/application/chart-drawing-application'
import { ChartDrawingService } from '~/domain/service/chart-drawing-service'
import type { IChartDrawingBoardProxy } from '~/domain/interface/i-chart-drawing-board-proxy'
import type { IDeviceChartDrawingProxy } from '~/domain/interface/i-device-chart-drawing-proxy'
import { ChartDrawing } from '~/domain/models/entities/chart-drawing'
import { ChartDrawingBoard } from '~/domain/models/entities/chart-drawing-board'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'

/** 帳號這一頭的第一個新編號；存回時沒有編號的依序拿 101、102…… */
export const FIRST_ISSUED_DRAWING_ID = 101

/**
 * 帳號裡的繪圖板：讀到 `storedBoard`（沒給就是從沒存過的空的一份）；
 * 存回時版本加一、沒有編號的依序發新編號、來源照帳號記的。
 */
export function chartDrawingBoardProxyOf(storedBoard: ChartDrawingBoard | null = null): IChartDrawingBoardProxy {
  return {
    fetchBoard: vi.fn(async (marketSide: MarketSideVo, symbol: string) =>
      storedBoard ?? new ChartDrawingBoard(marketSide, symbol, 0, [])),
    saveBoard: vi.fn(async (board: ChartDrawingBoard) => {
      const issuedIds = { next: FIRST_ISSUED_DRAWING_ID }

      return new ChartDrawingBoard(board.marketSide, board.symbol, board.revision + 1, board.drawings.map(drawing =>
        new ChartDrawing(drawing.id > 0 ? drawing.id : issuedIds.next++, drawing.kind, drawing.anchors,
          drawing.colorToken, drawing.lineWidth, drawing.lineStyle, drawing.locked, drawing.visible, drawing.source)))
    }),
    removeAssistantDrawings: vi.fn().mockResolvedValue(0),
  }
}

export function deviceChartDrawingProxyOf(deviceDrawings: ChartDrawing[] = []): IDeviceChartDrawingProxy {
  return {
    readChartDrawings: vi.fn().mockReturnValue(deviceDrawings),
    forgetChartDrawings: vi.fn(),
  }
}

/**
 * 繪圖那一塊：真的 Application 與 domain，只有帳號與這台裝置是替身——一開始什麼都沒畫過。
 * 圖表面板的測試不在意繪圖，給它一份真的就好，不必每個測試各自組。
 */
export function buildChartDrawingApplication(
  chartDrawingBoardProxy: IChartDrawingBoardProxy = chartDrawingBoardProxyOf(),
  deviceChartDrawingProxy: IDeviceChartDrawingProxy = deviceChartDrawingProxyOf(),
): ChartDrawingApplication {
  return new ChartDrawingApplication(new ChartDrawingService(chartDrawingBoardProxy, deviceChartDrawingProxy))
}
