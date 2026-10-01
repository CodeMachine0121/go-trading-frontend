import type { BacktestTradeStatistics } from '~/domain/models/entities/backtest'
import { BacktestTradeStatisticsDto } from '~/domain/models/dto/backtest-trade-statistics-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

const NOT_APPLICABLE = new LocalizedTextVo('不適用', 'N/A')

const RATIO_FRACTION_DIGITS = 2

const AMOUNT_FRACTION_DIGITS = 2

const PERCENTAGE_FRACTION_DIGITS = 2

/** 由大到小的時間單位，平均持倉時間取其中最大的兩個。 */
const HOLDING_TIME_UNITS: readonly { seconds: number, label: LocalizedTextVo }[] = [
  { seconds: 86400, label: new LocalizedTextVo('天', 'd') },
  { seconds: 3600, label: new LocalizedTextVo('小時', 'h') },
  { seconds: 60, label: new LocalizedTextVo('分', 'min') },
  { seconds: 1, label: new LocalizedTextVo('秒', 's') },
]

/**
 * Domain Model：五格統計在成績單上怎麼寫。
 *
 * 平均持倉時間只寫最大的兩個單位：「2 小時 30 分」比「2 小時 30 分 0 秒」好讀，
 * 而比兩個單位更細的那一截對一個平均數來說沒有意思。
 */
export class BacktestTradeStatisticsDomain {
  constructor(private readonly tradeStatistics: BacktestTradeStatistics) {}

  toDto(): BacktestTradeStatisticsDto {
    const statistics = this.tradeStatistics

    return new BacktestTradeStatisticsDto(
      statistics.profitFactor === null
        ? NOT_APPLICABLE
        : new UntranslatedTextVo(statistics.profitFactor.toFixed(RATIO_FRACTION_DIGITS)),
      statistics.expectancy === null
        ? NOT_APPLICABLE
        : new UntranslatedTextVo(statistics.expectancy.toFixed(AMOUNT_FRACTION_DIGITS)),
      statistics.averageHoldingSeconds === null
        ? NOT_APPLICABLE
        : this.holdingTime(statistics.averageHoldingSeconds),
      new LocalizedTextVo(
        `${statistics.maximumConsecutiveLossCount} 筆`,
        `${statistics.maximumConsecutiveLossCount} ${statistics.maximumConsecutiveLossCount === 1 ? 'trade' : 'trades'}`),
      statistics.costToGrossProfitRatio === null
        ? NOT_APPLICABLE
        : new UntranslatedTextVo(`${(statistics.costToGrossProfitRatio * 100).toFixed(PERCENTAGE_FRACTION_DIGITS)}%`),
    )
  }

  private holdingTime(averageHoldingSeconds: number): LocalizedTextVo {
    const totalSeconds = Math.max(0, Math.round(averageHoldingSeconds))
    const largestIndex = HOLDING_TIME_UNITS.findIndex(unit => totalSeconds >= unit.seconds)
    if (largestIndex === -1) {
      return new LocalizedTextVo('0 秒', '0 s')
    }

    const largest = HOLDING_TIME_UNITS[largestIndex]!
    const largestCount = Math.floor(totalSeconds / largest.seconds)
    const next = HOLDING_TIME_UNITS[largestIndex + 1]
    const nextCount = next === undefined ? 0 : Math.floor((totalSeconds % largest.seconds) / next.seconds)

    // 第二個單位是零時就不寫它：「1 小時」而不是「1 小時 0 分」。
    return next === undefined || nextCount === 0
      ? new LocalizedTextVo(
          `${largestCount} ${largest.label.traditionalChinese}`,
          `${largestCount} ${largest.label.english}`)
      : new LocalizedTextVo(
          `${largestCount} ${largest.label.traditionalChinese} ${nextCount} ${next.label.traditionalChinese}`,
          `${largestCount} ${largest.label.english} ${nextCount} ${next.label.english}`)
  }
}
