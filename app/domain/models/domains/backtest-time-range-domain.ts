import { BacktestTimeRangeDto } from '~/domain/models/dto/backtest-time-range-dto'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

/** 預設回看的天數：一個月夠看出一支策略的脾氣，又不必等太久。 */
const DEFAULT_LOOKBACK_DAYS = 30

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Domain Model：回測要重演的那一段，兩端都算在內。
 *
 * 它同時負責「一打開就有的那一組」與「這一組合不合理」，因為兩者是同一條知識的兩面：
 * 知道什麼樣的區間是合理的，才填得出一組合理的預設值。分開放，預設值遲早會填出
 * 一組自己的驗證會拒絕的東西。
 */
export class BacktestTimeRangeDomain {
  constructor(
    private readonly startTime: Date,
    private readonly endTime: Date,
  ) {}

  /**
   * 一打開回測就填好的那一段：**三十天前的當日零點**到**昨天的最後一刻**，
   * 皆為世界標準時間。
   *
   * 終點刻意停在昨天而不是此刻：今天還沒走完，把它算進去等於拿半天當一天。
   * 現在這一刻由外面給進來，所以「預設值是什麼」這條規則檢查得出來——
   * 一個讀時鐘的規則沒有辦法被驗證。
   */
  defaultRangeAt(now: Date): BacktestTimeRangeDto {
    const todayMidnight = Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())

    return new BacktestTimeRangeDto(
      new Date(todayMidnight - DEFAULT_LOOKBACK_DAYS * MILLISECONDS_PER_DAY),
      new Date(todayMidnight - 1),
    )
  }

  /**
   * 這一段講不講得通。講不通就帶著「是時間那一格」拋出——說明要留在那一格旁邊，
   * 而不是丟到頁面頂端。
   */
  validate(): void {
    if (Number.isNaN(this.startTime.getTime()) || Number.isNaN(this.endTime.getTime())) {
      throw new BacktestFieldError('timeRange', '請選一段有頭有尾的時間。')
    }

    if (this.startTime.getTime() > this.endTime.getTime()) {
      throw new BacktestFieldError('timeRange', '起點不能晚於終點。')
    }
  }
}
