import { IndicatorLevelDto } from '~/domain/models/dto/indicator-level-dto'
import { IndicatorSeriesDto } from '~/domain/models/dto/indicator-series-dto'

/**
 * DTO：一支策略套在圖上算成功之後，該畫出來的東西。
 *
 * 兩份清單**必有一份是空的**——一次計算只有一種指標值種類。分成兩份而不是一份帶旗標，
 * 是因為圖表要做的本來就是兩件不同的事（畫一條橫線／畫一條序列），
 * 分好之後它只剩兩個迴圈，不必自己分辨。
 *
 * 兩份都空也是合法的：算式一個指標名稱都沒放進結果，是成功，不是失敗。
 */
export class ChartIndicatorDto {
  constructor(
    public readonly strategyId: number,
    public readonly strategyName: string,
    public readonly levels: readonly IndicatorLevelDto[],
    public readonly series: readonly IndicatorSeriesDto[],
  ) {}

  /** 這一支這一輪一條線都沒畫出來。畫面據此說明它算成功但沒有東西可畫。 */
  get drawsNothing(): boolean {
    return this.levels.length === 0 && this.series.length === 0
  }

  /** 這一支目前用掉的顏色。下一支配色時要避開它們。 */
  get usedColorTokens(): string[] {
    return [
      ...this.levels.map(level => level.colorToken),
      ...this.series.map(oneSeries => oneSeries.colorToken),
    ]
  }

  /**
   * 換掉其中一條線的顏色，交出換過之後的自己；不是這一支的線就原樣交回。
   *
   * 換色必須**立刻**看得見，而重算一次只為了換個顏色是荒謬的——
   * 算出來的值一個字都不會變。所以這裡就地換，下次重算時再由記住的偏好自然接上。
   */
  withLineColor(lineKey: string, colorToken: string): ChartIndicatorDto {
    return new ChartIndicatorDto(
      this.strategyId,
      this.strategyName,
      this.levels.map(level => (level.lineKey === lineKey
        ? new IndicatorLevelDto(level.lineKey, level.indicatorName, colorToken, level.value)
        : level)),
      this.series.map(oneSeries => (oneSeries.lineKey === lineKey
        ? new IndicatorSeriesDto(
            oneSeries.lineKey, oneSeries.indicatorName, colorToken, oneSeries.points)
        : oneSeries)),
    )
  }
}
