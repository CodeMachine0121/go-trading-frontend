import type { ChartDrawing } from '~/domain/models/entities/chart-drawing'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'

/**
 * 介面以「能力」命名：它說的是「記住某一邊某一檔畫了什麼」，不是「用瀏覽器儲存」。
 * 哪天要讓另一台電腦也看得到，換一個打後端的實作，這個名字一個字都不必改。
 *
 * 讀不出來回空的一份、寫不進去不出聲——繪圖畫不畫得出來，不該取決於記不記得住。
 *
 * 實作在 app/infrastructure/proxy/chart-drawing-preference-proxy.ts。
 */
export interface IChartDrawingPreferenceProxy {
  readChartDrawings(marketSide: MarketSideVo, symbol: string): ChartDrawing[]
  writeChartDrawings(marketSide: MarketSideVo, symbol: string, chartDrawings: readonly ChartDrawing[]): void
}
