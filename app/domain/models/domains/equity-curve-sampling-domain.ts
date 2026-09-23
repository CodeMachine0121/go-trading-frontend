import type { EquityPointDto } from '~/domain/models/dto/equity-point-dto'

/** 畫圖時最多畫幾點。一千段、每段兩點，足以看出形狀，也畫得很快。 */
const DEFAULT_MAXIMUM_POINT_COUNT = 2000

/**
 * Domain Model：把一條很長的資金曲線取樣成畫得動、又不失形狀的樣子。
 *
 * 取樣只為了畫圖：成績單上的每一個數字都來自完整的結果，不看這裡。
 * 取法是**每一小段留最高與最低那兩點**，頭尾一定在——平均或每隔幾點取一點都會把大回撤的谷底抹掉，
 * 而那正是讀資金曲線的人最想看到的地方。
 */
export class EquityCurveSamplingDomain {
  constructor(
    private readonly equityCurve: readonly EquityPointDto[],
    private readonly maximumPointCount: number = DEFAULT_MAXIMUM_POINT_COUNT,
  ) {}

  sample(): readonly EquityPointDto[] {
    const pointCount = this.equityCurve.length
    if (pointCount <= this.maximumPointCount) {
      return this.equityCurve
    }

    // 頭尾各佔一點，其餘的點數兩兩一段。
    const segmentCount = Math.floor((this.maximumPointCount - 2) / 2)
    const interiorCount = pointCount - 2
    const keptIndexes = new Set<number>([0, pointCount - 1])

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
      const segmentStart = 1 + Math.floor((segmentIndex * interiorCount) / segmentCount)
      const segmentEnd = 1 + Math.floor(((segmentIndex + 1) * interiorCount) / segmentCount)
      let highestIndex = segmentStart
      let lowestIndex = segmentStart

      for (let pointIndex = segmentStart; pointIndex < segmentEnd; pointIndex++) {
        const equity = this.equityCurve[pointIndex]!.equity
        if (equity.greaterThan(this.equityCurve[highestIndex]!.equity)) {
          highestIndex = pointIndex
        }
        if (equity.lessThan(this.equityCurve[lowestIndex]!.equity)) {
          lowestIndex = pointIndex
        }
      }

      keptIndexes.add(highestIndex)
      keptIndexes.add(lowestIndex)
    }

    return [...keptIndexes].sort((former, latter) => former - latter)
      .map(pointIndex => this.equityCurve[pointIndex]!)
  }
}
