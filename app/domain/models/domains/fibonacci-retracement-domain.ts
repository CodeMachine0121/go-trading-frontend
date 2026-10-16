import Decimal from 'decimal.js'
import type { ChartDrawingAnchorVo } from '~/domain/models/vo/chart-drawing-anchor-vo'
import { FibonacciLevelDto } from '~/domain/models/dto/fibonacci-level-dto'
import { FIBONACCI_RATIOS } from '~/domain/models/vo/fibonacci-ratio-vo'

/**
 * Domain Model：斐波那契回撤的各條。
 *
 * 從第一點拉到第二點：**第二點是 0、第一點是 1**——拉的方向就是回檔的方向，
 * 0 落在剛走到的那一頭。
 */
export class FibonacciRetracementDomain {
  constructor(
    private readonly firstAnchor: ChartDrawingAnchorVo,
    private readonly secondAnchor: ChartDrawingAnchorVo,
  ) {}

  levels(): FibonacciLevelDto[] {
    const span = this.firstAnchor.price.minus(this.secondAnchor.price)

    return FIBONACCI_RATIOS.map(level => new FibonacciLevelDto(
      level.ratio,
      this.secondAnchor.price.plus(span.times(new Decimal(level.ratio))),
      level.colorToken,
    ))
  }
}
