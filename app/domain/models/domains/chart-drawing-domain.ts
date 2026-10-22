import type { ChartDrawingCommandDto } from '~/domain/models/dto/chart-drawing-command-dto'
import type { KCandleDto } from '~/domain/models/dto/k-candle-dto'
import type { KCandleTimelineDomain } from '~/domain/models/domains/k-candle-timeline-domain'
import { ChartDrawing } from '~/domain/models/entities/chart-drawing'
import { ChartDrawingDto } from '~/domain/models/dto/chart-drawing-dto'
import { ChartDrawingAnchorDto } from '~/domain/models/dto/chart-drawing-anchor-dto'
import { PlacedChartDrawingDto } from '~/domain/models/dto/placed-chart-drawing-dto'
import { FibonacciRetracementDomain } from '~/domain/models/domains/fibonacci-retracement-domain'
import { DateAndPriceRangeMeasurementDomain } from '~/domain/models/domains/date-and-price-range-measurement-domain'
import { type ChartDrawingKindVo, chartDrawingKindOf } from '~/domain/models/vo/chart-drawing-kind-vo'
import { CHART_DRAWING_COLORS } from '~/domain/models/vo/chart-drawing-color-vo'
import {
  CHART_DRAWING_LINE_STYLES,
  CHART_DRAWING_MAXIMUM_LINE_WIDTH,
  CHART_DRAWING_MINIMUM_LINE_WIDTH,
} from '~/domain/models/vo/chart-drawing-line-style-vo'

/**
 * Domain Model：一個繪圖能做的事。
 *
 * 每一個動作都交回**一個新的**繪圖，而不是改自己：繪圖板要留著改之前的那一份當上一步。
 * 做不了的動作（鎖定的不能動、固定配色的不能改色）交回自己，
 * 繪圖板因此靠「有沒有變」就知道要不要記一步。
 */
export class ChartDrawingDomain {
  private readonly drawing: ChartDrawing
  private readonly kind: ChartDrawingKindVo

  /**
   * 建構時把讀進來的值收進合理範圍：線寬夾在一到四之間、認不得的顏色退回這種繪圖的預設色、
   * 多出來的錨點丟掉——留存可能來自另一個版本，不信任它原樣是對的。
   */
  constructor(drawing: ChartDrawing) {
    this.kind = chartDrawingKindOf(drawing.kind)

    const lineWidth = Number.isInteger(drawing.lineWidth)
      ? Math.min(Math.max(drawing.lineWidth, CHART_DRAWING_MINIMUM_LINE_WIDTH), CHART_DRAWING_MAXIMUM_LINE_WIDTH)
      : this.kind.defaultLineWidth
    const colorToken = CHART_DRAWING_COLORS.some(color => color.token === drawing.colorToken)
      ? drawing.colorToken
      : this.kind.defaultColorToken

    this.drawing = new ChartDrawing(
      drawing.id, this.kind.value, drawing.anchors.slice(0, this.kind.maximumAnchorCount), colorToken,
      lineWidth, drawing.lineStyle, drawing.locked, drawing.visible, drawing.source)
  }

  get id(): number {
    return this.drawing.id
  }

  /** 換一個識別碼——繪圖板收下一個新繪圖時由它發號碼。 */
  numbered(id: number): ChartDrawingDomain {
    return this.rebuilt({ id })
  }

  get anchorCount(): number {
    return this.drawing.anchors.length
  }

  get drawnByAssistant(): boolean {
    return this.drawing.source === 'assistant'
  }

  /** 編號、種類、錨點、樣式、鎖定、顯示都一樣。來源由帳號記，不算在內。 */
  sameAs(other: ChartDrawingDomain): boolean {
    const mine = this.drawing
    const theirs = other.drawing

    return mine.id === theirs.id && mine.kind === theirs.kind && mine.colorToken === theirs.colorToken
      && mine.lineWidth === theirs.lineWidth && mine.lineStyle === theirs.lineStyle
      && mine.locked === theirs.locked && mine.visible === theirs.visible
      && mine.anchors.length === theirs.anchors.length
      && mine.anchors.every((anchor, index) => {
        const theirAnchor = theirs.anchors[index]

        return theirAnchor !== undefined && anchor.openTime.getTime() === theirAnchor.openTime.getTime()
          && anchor.price.equals(theirAnchor.price)
      })
  }

  /** 存進帳號之後，換成帳號發的編號與帳號記的來源；形狀與樣式維持這裡的。 */
  withSavedIdentityOf(saved: ChartDrawingDomain): ChartDrawingDomain {
    return this.rebuilt({ id: saved.drawing.id, source: saved.drawing.source })
  }

  applied(command: ChartDrawingCommandDto): ChartDrawingDomain {
    const drawing = this.drawing

    switch (command.kind) {
      case 'replaceAnchors': {
        // 換成一模一樣的錨點也是沒有變：點一下沒拖，不該多一步。
        const unchanged = command.anchors.length === drawing.anchors.length && command.anchors.every((anchor, index) => {
          const current = drawing.anchors[index]

          return current !== undefined && current.openTime.getTime() === anchor.openTime.getTime()
            && current.price.equals(anchor.price)
        })
        const acceptable = command.anchors.length >= this.kind.minimumAnchorCount
          && command.anchors.length <= this.kind.maximumAnchorCount
          && command.anchors.every(anchor => anchor.price.greaterThan(0))

        return drawing.locked || !acceptable || unchanged
          ? this
          : this.rebuilt({ anchors: [...command.anchors] })
      }
      case 'cycleLineWidth':
        return this.kind.styleEditable
          ? this.rebuilt({ lineWidth: drawing.lineWidth % CHART_DRAWING_MAXIMUM_LINE_WIDTH + 1 })
          : this
      case 'cycleLineStyle': {
        const nextStyle = CHART_DRAWING_LINE_STYLES[
          (CHART_DRAWING_LINE_STYLES.indexOf(drawing.lineStyle) + 1) % CHART_DRAWING_LINE_STYLES.length]

        return this.kind.styleEditable && nextStyle !== undefined ? this.rebuilt({ lineStyle: nextStyle }) : this
      }
      case 'changeColor':
        return this.kind.styleEditable && command.colorToken !== null
          && CHART_DRAWING_COLORS.some(color => color.token === command.colorToken)
          ? this.rebuilt({ colorToken: command.colorToken })
          : this
      case 'toggleLocked':
        return this.rebuilt({ locked: !drawing.locked })
      case 'toggleVisible':
        return this.rebuilt({ visible: !drawing.visible })
    }
  }

  /**
   * 放到一張圖上：錨點在這張圖上是第幾根，以及這種繪圖要畫的衍生值。
   * 自由筆跡的點落在那一根裡的哪個位置就畫在哪；其餘對到涵蓋它的那一根。
   */
  placedOn(timeline: KCandleTimelineDomain, kCandles: readonly KCandleDto[]): PlacedChartDrawingDto {
    const anchors = this.drawing.anchors.map(anchor => new ChartDrawingAnchorDto(
      anchor.openTime, anchor.price, this.kind.freehand
        ? timeline.fractionalLogicalIndexOf(anchor.openTime)
        : timeline.logicalIndexOf(anchor.openTime)))
    const [firstAnchor, secondAnchor] = anchors

    const fibonacciLevels = this.kind.value === 'fibonacciRetracement' && firstAnchor && secondAnchor
      ? new FibonacciRetracementDomain(firstAnchor.toVo(), secondAnchor.toVo()).levels()
      : []
    const measurement = this.kind.value === 'dateAndPriceRange' && firstAnchor && secondAnchor
      ? new DateAndPriceRangeMeasurementDomain(firstAnchor, secondAnchor, kCandles).toDto()
      : null

    return new PlacedChartDrawingDto(this.toDto(), anchors, fibonacciLevels, measurement)
  }

  toEntity(): ChartDrawing {
    return this.drawing
  }

  toDto(): ChartDrawingDto {
    const drawing = this.drawing

    return new ChartDrawingDto(
      drawing.id, drawing.kind, this.kind.label, drawing.anchors, drawing.colorToken, drawing.lineWidth,
      drawing.lineStyle, drawing.locked, drawing.visible, this.kind.styleEditable, drawing.source,
      this.drawnByAssistant, this.kind.freehand)
  }

  /** 照自己的樣子換掉其中幾項，交回一個新的繪圖。 */
  private rebuilt(changes: Partial<ChartDrawing>): ChartDrawingDomain {
    const drawing = this.drawing

    return new ChartDrawing(
      changes.id ?? drawing.id,
      drawing.kind,
      changes.anchors ?? drawing.anchors,
      changes.colorToken ?? drawing.colorToken,
      changes.lineWidth ?? drawing.lineWidth,
      changes.lineStyle ?? drawing.lineStyle,
      changes.locked ?? drawing.locked,
      changes.visible ?? drawing.visible,
      changes.source ?? drawing.source,
    ).toDomain()
  }
}
