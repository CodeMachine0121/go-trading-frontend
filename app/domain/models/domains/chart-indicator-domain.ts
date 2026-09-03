import type { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import type { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { ChartLineColorDomain } from '~/domain/models/domains/chart-line-color-domain'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorLevelDto } from '~/domain/models/dto/indicator-level-dto'
import { IndicatorPointDto } from '~/domain/models/dto/indicator-point-dto'
import { IndicatorSeriesDto } from '~/domain/models/dto/indicator-series-dto'

/**
 * Domain Model：一次計算的結果在圖上該畫成什麼。
 *
 * **這是唯一知道「一個數字畫成水平線、一串數字畫成跟著 K 線走的曲線」的地方。**
 * 畫面收到的是兩份已經分好類、連顏色與標籤都定好的清單，因此那個認識繪圖函式庫的檔案
 * 不必為了畫指標學會任何一種判斷——它多的是兩個迴圈，不是一個 if。
 *
 * 一支算式可以一次產出好幾個指標名稱，所以產出的是「幾條線」而不是「一條線」。
 * 顏色的身分是**策略識別碼加指標名稱**：同一支策略畫出的兩條線因此各有各的顏色，
 * 而重新打開畫面之後同一條線還認得出自己挑過什麼色。
 */
export class ChartIndicatorDomain {
  private readonly resultType: IndicatorResultTypeDomain

  constructor(
    private readonly strategyId: number,
    private readonly indicatorCalculation: IndicatorCalculation,
    /** 這條線挑過的顏色，沒挑過的不在裡面。鍵是線的身分。 */
    private readonly rememberedColorTokens: ReadonlyMap<string, string>,
    /** 圖上其他線已經用掉的顏色——沒有它，第二條線就會與第一條同色。 */
    private readonly takenColorTokens: readonly string[],
  ) {
    this.resultType = new IndicatorResultTypeDomain(indicatorCalculation.resultType)
  }

  /** 指標值是一個數字時畫的那幾條水平線。是一串數字時這裡是空的。 */
  toLevelDtos(): IndicatorLevelDto[] {
    if (this.resultType.isList()) {
      return []
    }

    return this.drawableLines().flatMap((line) => {
      const value = line.indicatorValue.items[0]
      // 一個數字的種類下卻沒有值，就沒有線可畫。空的一組是合法結果，不是失敗。
      if (typeof value !== 'number') {
        return []
      }

      return [new IndicatorLevelDto(
        line.lineKey, line.indicatorValue.name, line.colorToken, value)]
    })
  }

  /** 指標值是一串數字時畫的那幾條曲線。是一個數字時這裡是空的。 */
  toSeriesDtos(): IndicatorSeriesDto[] {
    if (!this.resultType.isList()) {
      return []
    }

    return this.drawableLines().map(line => new IndicatorSeriesDto(
      line.lineKey,
      line.indicatorValue.name,
      line.colorToken,
      this.pointsOf(line.indicatorValue.items),
    ))
  }

  /**
   * 每一個畫得出來的指標名稱，配上它的身分與顏色。
   *
   * 配色只在這裡發生一次，而且是**逐條往下配**——每配出一個顏色就把它算進「已經用掉的」，
   * 下一條才不會拿到同一個。兩個公開方法都從這裡出發，因此不論結果是哪一種種類，
   * 配色規則都只有這一份。
   */
  private drawableLines() {
    const assignedTokens = [...this.takenColorTokens]

    return this.numericIndicatorValues().map((indicatorValue) => {
      const lineKey = `${this.strategyId}:${indicatorValue.name}`
      const colorToken = new ChartLineColorDomain(
        this.rememberedColorTokens.get(lineKey) ?? null, assignedTokens).token
      assignedTokens.push(colorToken)

      return { indicatorValue, lineKey, colorToken }
    })
  }

  /**
   * 第 n 個值配上第 n 根 K 線的**起始時間**。
   *
   * 沒有對應的那一根就沒有那一點——**這一句就是對位規則本身**。
   * 兩邊的長度不保證相同（算式可以只回一部分，系統也可能少讀幾根），
   * 而補一個點出來，看起來會與算出來的一模一樣。
   */
  private pointsOf(items: readonly (number | boolean)[]): IndicatorPointDto[] {
    const points: IndicatorPointDto[] = []

    for (const [index, value] of items.entries()) {
      const openTime = this.indicatorCalculation.openTimes[index]
      if (typeof value === 'number' && openTime !== undefined) {
        points.push(new IndicatorPointDto(openTime, value))
      }
    }

    return points
  }

  /**
   * 依名稱排序，理由與結果表格那邊一字不差：算式產出的順序不保證固定，
   * 而順序在這裡還多決定一件事——沒挑過顏色時是誰先拿到哪個顏色。
   * 不排的話，同一支策略每算一次，兩條線的顏色就可能對調。
   *
   * 比的是碼位而不是語系字序：同一組結果在不同瀏覽器上必須排出同一個順序。
   */
  private numericIndicatorValues(): IndicatorValueVo[] {
    return [...this.indicatorCalculation.indicatorValues]
      .filter(indicatorValue => indicatorValue.items.every(item => typeof item === 'number'))
      .sort((former, latter) => {
        if (former.name === latter.name) {
          return 0
        }

        return former.name < latter.name ? -1 : 1
      })
  }
}
