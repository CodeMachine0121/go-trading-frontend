import { vi } from 'vitest'
import { ChartDrawingApplication } from '~/application/chart-drawing-application'
import { ChartDrawingService } from '~/domain/service/chart-drawing-service'
import type { IChartDrawingPreferenceProxy } from '~/domain/interface/i-chart-drawing-preference-proxy'

/**
 * 繪圖那一塊：真的 Application 與 domain，只有留存是替身——一開始什麼都沒畫過。
 * 圖表面板的測試不在意繪圖，給它一份真的就好，不必每個測試各自組。
 */
export function buildChartDrawingApplication(
  chartDrawingPreferenceProxy: IChartDrawingPreferenceProxy = {
    readChartDrawings: vi.fn().mockReturnValue([]),
    writeChartDrawings: vi.fn(),
  },
): ChartDrawingApplication {
  return new ChartDrawingApplication(new ChartDrawingService(chartDrawingPreferenceProxy))
}
