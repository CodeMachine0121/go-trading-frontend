import type { ChartDrawingAnchorDto } from '~/domain/models/dto/chart-drawing-anchor-dto'
import type { ChartDrawingDto } from '~/domain/models/dto/chart-drawing-dto'
import type { DateAndPriceRangeMeasurementDto } from '~/domain/models/dto/date-and-price-range-measurement-dto'
import type { FibonacciLevelDto } from '~/domain/models/dto/fibonacci-level-dto'

/**
 * 放到某一張圖上的繪圖：錨點在這張圖上是第幾根，以及這種繪圖要畫出的衍生值。
 *
 * 衍生值只有斐波那契回撤與日期與價格範圍有，其餘種類是空的。
 */
export class PlacedChartDrawingDto {
  constructor(
    public readonly drawing: ChartDrawingDto,
    public readonly anchors: readonly ChartDrawingAnchorDto[],
    public readonly fibonacciLevels: readonly FibonacciLevelDto[],
    public readonly measurement: DateAndPriceRangeMeasurementDto | null,
  ) {}
}
