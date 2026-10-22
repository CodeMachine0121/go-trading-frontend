import type { ChartDrawingStrokePointDto } from '~/domain/models/dto/chart-drawing-stroke-point-dto'

/** 與前後連線相差不到這麼多像素的點，畫出來看不出差別。 */
export const FREEHAND_STROKE_SIMPLIFICATION_TOLERANCE_PIXELS = 1

/**
 * Domain Model：一筆手畫的筆跡，從取到的點收成要留下的那幾個。
 *
 * 價格不大於零的點略過、與上一個點同一個像素的不重複記；
 * 再用 Ramer–Douglas–Peucker 省掉幾乎在同一條線上的點，
 * 省完仍超過上限時從頭到尾平均挑——頭尾兩點一定留著。
 */
export class FreehandStrokeDomain {
  private readonly points: readonly ChartDrawingStrokePointDto[]

  constructor(points: readonly ChartDrawingStrokePointDto[], private readonly maximumPointCount: number) {
    this.points = points
      .filter(point => point.price.greaterThan(0))
      .filter((point, index, positivePoints) => {
        const previous = positivePoints[index - 1]
        return previous === undefined || previous.x !== point.x || previous.y !== point.y
      })
  }

  simplified(): ChartDrawingStrokePointDto[] {
    const keep = new Array<boolean>(this.points.length).fill(false)
    keep[0] = true
    keep[this.points.length - 1] = true
    const pending: [number, number][] = this.points.length > 2 ? [[0, this.points.length - 1]] : []

    while (pending.length > 0) {
      const [startIndex, endIndex] = pending.pop() ?? [0, 0]
      const start = this.points[startIndex]
      const end = this.points[endIndex]
      if (start === undefined || end === undefined) {
        continue
      }

      const deltaX = end.x - start.x
      const deltaY = end.y - start.y
      const length = Math.hypot(deltaX, deltaY)
      let farthestIndex = startIndex
      let farthestDistance = 0
      for (let index = startIndex + 1; index < endIndex; index++) {
        const point = this.points[index]
        const distance = point === undefined
          ? 0
          : length === 0
            ? Math.hypot(point.x - start.x, point.y - start.y)
            : Math.abs(deltaY * point.x - deltaX * point.y + end.x * start.y - end.y * start.x) / length
        if (distance > farthestDistance) {
          farthestDistance = distance
          farthestIndex = index
        }
      }

      if (farthestDistance > FREEHAND_STROKE_SIMPLIFICATION_TOLERANCE_PIXELS) {
        keep[farthestIndex] = true
        pending.push([startIndex, farthestIndex], [farthestIndex, endIndex])
      }
    }

    const simplified = this.points.filter((_point, index) => keep[index])
    if (simplified.length <= this.maximumPointCount) {
      return simplified
    }

    const step = (simplified.length - 1) / (this.maximumPointCount - 1)
    return Array.from({ length: this.maximumPointCount }, (_unused, index) => simplified[Math.round(index * step)])
      .filter(point => point !== undefined)
  }
}
