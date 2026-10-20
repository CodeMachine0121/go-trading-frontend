import type { ChartDrawing } from '~/domain/models/entities/chart-drawing'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'

/**
 * 這台裝置上的舊繪圖：繪圖存進帳號之前，記在這台裝置裡的那一份。
 * 只剩讀出來搬進帳號、搬完忘掉；讀不出來回空的一份，忘不掉不出聲。
 */
export interface IDeviceChartDrawingProxy {
  readChartDrawings(marketSide: MarketSideVo, symbol: string): ChartDrawing[]
  forgetChartDrawings(marketSide: MarketSideVo, symbol: string): void
}
