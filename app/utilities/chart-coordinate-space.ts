import type { IChartApi, ISeriesApi, Logical, SeriesType } from 'lightweight-charts'

/**
 * 繪圖函式庫的座標換算，交給疊在圖上的那一層用。
 *
 * 它是純粹的黏合：「第幾根」與 x、「多少價」與 y 怎麼互換，畫面現在多寬多高、軸佔多少——
 * 全部問繪圖函式庫，自己不算任何東西，也不認識任何領域資料。
 * 疊在上面的那一層因此不必 import 繪圖函式庫，換一個函式庫只改這一個檔。
 *
 * 主序列會隨畫法被換掉，所以拿的是「目前那一條」的取法，不是某一條本身。
 */
export class ChartCoordinateSpace {
  constructor(
    private readonly chartApi: IChartApi,
    private readonly currentSeries: () => ISeriesApi<SeriesType> | null,
  ) {}

  logicalToX(logicalIndex: number): number | null {
    return this.chartApi.timeScale().logicalToCoordinate(logicalIndex as Logical)
  }

  xToLogical(x: number): number | null {
    return this.chartApi.timeScale().coordinateToLogical(x)
  }

  priceToY(price: number): number | null {
    return this.currentSeries()?.priceToCoordinate(price) ?? null
  }

  yToPrice(y: number): number | null {
    return this.currentSeries()?.coordinateToPrice(y) ?? null
  }

  /** 價格照價格軸的寫法寫——軸上的標籤與繪圖的標籤才會是同一種說法。 */
  formatPrice(price: number): string {
    return this.currentSeries()?.priceFormatter().format(price) ?? String(price)
  }

  /** 畫 K 線的那一塊（不含兩條軸）的寬與高。 */
  plotWidth(): number {
    return this.chartApi.timeScale().width()
  }

  plotHeight(): number {
    return this.chartApi.paneSize(0).height
  }

  priceAxisWidth(): number {
    return this.chartApi.priceScale('right').width()
  }

  timeAxisHeight(): number {
    return this.chartApi.timeScale().height()
  }

  /**
   * 畫面上目前的樣子濃縮成一串字：看哪幾根、價格軸從多少到多少、多大。
   * 疊在上面的那一層拿它比對，**變了才重畫**——繪圖函式庫沒有「價格軸被拖了」這種通知。
   */
  signature(): string {
    const range = this.chartApi.timeScale().getVisibleLogicalRange()

    return [
      range?.from, range?.to, this.yToPrice(0), this.yToPrice(this.plotHeight()),
      this.plotWidth(), this.plotHeight(), this.priceAxisWidth(),
    ].join('|')
  }

  /** 正在畫或拖一個繪圖時，圖本身不能跟著被拖走或縮放；放手後恢復。 */
  setPanAndZoomEnabled(enabled: boolean): void {
    this.chartApi.applyOptions({ handleScroll: enabled, handleScale: enabled })
  }
}
