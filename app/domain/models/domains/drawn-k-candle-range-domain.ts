import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { ChartVisibleRangeVo } from '~/domain/models/vo/chart-visible-range-vo'
import { DrawnKCandleRangeVo } from '~/domain/models/vo/drawn-k-candle-range-vo'

/**
 * 最新那一根右邊留多寬的空白，以**正在看的那幾根**的一成計。
 *
 * 一成而不是固定幾根：固定幾根在看一天時剛剛好，在看一年時會窄到看不出來——
 * 那時留白等於沒有，而它要解決的問題（最新那一根被邊框切掉半根）原封不動地回來。
 * 比例則讓留白在任何縮放倍率下都是同樣的視覺比重。
 */
const RIGHT_MARGIN_RATIO = 0.1

/**
 * Domain Model：使用者要看的那一段時間，換算成圖上要從第幾根畫到第幾根。
 *
 * 它是「畫面擺在哪裡」這件事**唯一**的出處。分成兩件事看會比較好理解：
 *
 * 1. **哪幾根落在他要看的那一段裡**——兩端各往內對齊到一根真正存在的 K 線。
 * 2. **右邊要不要再留一段空白**——只有在他已經看到最新那一根時才留。
 *    看一段已經過去的行情時右邊本來就還有 K 線，硬留一段空白等於把它們推出畫面外，
 *    而他往回拖正是為了看那些。
 *
 * 判準「看得到最新那一根」**沿用顯示區間自己的那一條**，不在這裡重新定義一次：
 * 指標要算到哪一刻問的也是它，兩處若各寫一份，某次改動之後就會開始說不同的話，
 * 而畫面上看起來只是「留白偶爾不見」。
 */
export class DrawnKCandleRangeDomain {
  constructor(
    private readonly kCandleChartDto: KCandleChartDto | null,
    private readonly chartVisibleRangeVo: ChartVisibleRangeVo,
  ) {}

  /** 沒有東西可畫時是 `null`——一根都沒有的圖談不上要從第幾根畫到第幾根。 */
  toVo(): DrawnKCandleRangeVo | null {
    const kCandleChartDto = this.kCandleChartDto
    if (kCandleChartDto === null || kCandleChartDto.isEmpty) {
      return null
    }

    const kCandles = kCandleChartDto.kCandles
    const lastPosition = kCandles.length - 1

    // 兩端都往內對齊到一根真正存在的 K 線：起點取第一根不早於它的，終點取最後一根不晚於它的。
    // 對齊不到時（那一段整個落在資料的某一側）一律退到最靠近的那一根，
    // 與繪圖函式庫拿時刻定位時的收法一致——圖因此不會因為換了定位方式而差一根。
    const firstNotBefore = kCandles.findIndex(
      kCandle => kCandle.openTime.getTime() >= this.chartVisibleRangeVo.startTime.getTime())
    const firstAfter = kCandles.findIndex(
      kCandle => kCandle.openTime.getTime() > this.chartVisibleRangeVo.endTime.getTime())

    const toPosition = firstAfter === -1 ? lastPosition : Math.max(firstAfter - 1, 0)
    // 起點不得晚於終點：資料稀疏時兩端可能對齊到交叉的位置，而交叉的一段畫不出來。
    const fromPosition = Math.min(
      firstNotBefore === -1 ? lastPosition : firstNotBefore, toPosition)

    const rightMarginPositions
      = this.chartVisibleRangeVo.showsTheLatestKCandle(kCandleChartDto.latestKCandleOpenTime)
        ? (toPosition - fromPosition) * RIGHT_MARGIN_RATIO
        : 0

    return new DrawnKCandleRangeVo(fromPosition, toPosition + rightMarginPositions)
  }
}
