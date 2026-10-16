import Decimal from 'decimal.js'
import type { IChartDrawingPreferenceProxy } from '~/domain/interface/i-chart-drawing-preference-proxy'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'
import { ChartDrawing } from '~/domain/models/entities/chart-drawing'
import { ChartDrawingAnchorVo } from '~/domain/models/vo/chart-drawing-anchor-vo'
import { chartDrawingKindOf, isChartDrawingKindValue } from '~/domain/models/vo/chart-drawing-kind-vo'
import { CHART_DRAWING_LINE_STYLES, type ChartDrawingLineStyle } from '~/domain/models/vo/chart-drawing-line-style-vo'

/** 記在瀏覽器儲存裡的鍵。換名字等於忘掉所有人畫過的東西，所以只寫在這裡一次。 */
const CHART_DRAWINGS_STORAGE_KEY = 'go-trading:chart-drawings'

/**
 * 留存下來的 wire 形狀，只存在於本檔內。
 *
 * 每個欄位都是 `unknown`：瀏覽器儲存裡的東西可能來自另一個版本，逐欄驗過才收。
 */
type ChartDrawingWire = {
  id: unknown
  kind: unknown
  anchors: unknown
  colorToken: unknown
  lineWidth: unknown
  lineStyle: unknown
  locked: unknown
  visible: unknown
}

type ChartDrawingAnchorWire = {
  openTime: unknown
  price: unknown
}

/**
 * Proxy：把每一邊每一檔的繪圖記在瀏覽器儲存裡。整份是一個物件，鍵是「市場:交易標的」。
 *
 * 讀不出來（無痕視窗、封鎖網站資料、內容壞了）就是沒畫過；**壞掉的那一筆跳過**，其餘照樣回來。
 * 寫不進去不出聲：這一次已經畫在圖上了，只是下次打開不在。
 */
export class ChartDrawingPreferenceProxy implements IChartDrawingPreferenceProxy {
  readChartDrawings(marketSide: MarketSideVo, symbol: string): ChartDrawing[] {
    const wires = this.readAll()[`${marketSide}:${symbol}`]

    return Array.isArray(wires) ? wires.flatMap(wire => this.toChartDrawings(wire)) : []
  }

  writeChartDrawings(marketSide: MarketSideVo, symbol: string, chartDrawings: readonly ChartDrawing[]): void {
    try {
      const all = this.readAll()
      all[`${marketSide}:${symbol}`] = chartDrawings.map(chartDrawing => ({
        id: chartDrawing.id,
        kind: chartDrawing.kind,
        anchors: chartDrawing.anchors.map(anchor => ({
          openTime: anchor.openTime.toISOString(),
          price: anchor.price.toString(),
        })),
        colorToken: chartDrawing.colorToken,
        lineWidth: chartDrawing.lineWidth,
        lineStyle: chartDrawing.lineStyle,
        locked: chartDrawing.locked,
        visible: chartDrawing.visible,
      }))
      localStorage.setItem(CHART_DRAWINGS_STORAGE_KEY, JSON.stringify(all))
    }
    catch {
      // 記不住不影響這一次：繪圖已經在圖上了。
    }
  }

  /** 整份讀出來；讀不出來或不是一個物件時當成空的一份。 */
  private readAll(): Record<string, unknown> {
    try {
      const stored = localStorage.getItem(CHART_DRAWINGS_STORAGE_KEY)
      const parsed: unknown = stored === null ? {} : JSON.parse(stored)

      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {}
    }
    catch {
      return {}
    }
  }

  /** 一筆讀得出來就交出一個，讀不出來就交出零個。 */
  private toChartDrawings(wire: unknown): ChartDrawing[] {
    if (typeof wire !== 'object' || wire === null) {
      return []
    }

    const { id, kind, anchors, colorToken, lineWidth, lineStyle, locked, visible } = wire as ChartDrawingWire
    if (typeof id !== 'number' || !Number.isInteger(id) || !isChartDrawingKindValue(kind)
      || !Array.isArray(anchors) || typeof colorToken !== 'string' || typeof lineWidth !== 'number'
      || !CHART_DRAWING_LINE_STYLES.includes(lineStyle as ChartDrawingLineStyle)
      || typeof locked !== 'boolean' || typeof visible !== 'boolean') {
      return []
    }

    const anchorVos = anchors.flatMap((anchor: unknown) => {
      if (typeof anchor !== 'object' || anchor === null) {
        return []
      }
      const { openTime, price } = anchor as ChartDrawingAnchorWire
      const parsedTime = typeof openTime === 'string' ? new Date(openTime) : null
      if (parsedTime === null || Number.isNaN(parsedTime.getTime()) || typeof price !== 'string') {
        return []
      }
      try {
        return [new ChartDrawingAnchorVo(parsedTime, new Decimal(price))]
      }
      catch {
        return []
      }
    })
    // 錨點數對不上這種繪圖（少一個、或其中一個讀不出來）就畫不出來：整筆跳過，
    // 而不是畫成一個少一角的東西。
    if (anchorVos.length !== anchors.length || anchorVos.length !== chartDrawingKindOf(kind).anchorCount) {
      return []
    }

    return [new ChartDrawing(id, kind, anchorVos, colorToken, lineWidth, lineStyle as ChartDrawingLineStyle, locked, visible)]
  }
}
