import type { PositionPlanDto } from '~/domain/models/dto/position-plan-dto'
import { ExitDistanceDomain } from '~/domain/models/domains/exit-distance-domain'
import { PositionSizingDomain } from '~/domain/models/domains/position-sizing-domain'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

/** 合約帳戶上最小的倍數：一倍也是一筆合約部位，再小就不是槓桿了。 */
const MINIMUM_LEVERAGE = 1

/**
 * Domain Model：一組部位規劃送不送得出去。
 *
 * **它不判斷「有沒有部位規劃」**——那是整個物件是不是 `null`，而 `null` 根本不會
 * 走到這裡。「區塊收著的時候一格都不看」因此是呼叫端的一行 if，
 * 不是這裡的一條規則。
 *
 * 押多少那兩條**委派**給回測那一列已經在用的那個模型，而不是重寫：
 * 「百分比要大於零且不超過一百」這句話在這個專案裡只該有一份，
 * 而多一份的那一天，兩張表單會對同一個 150 給出兩種說法。
 */
export class PositionPlanDomain {
  constructor(private readonly positionPlan: PositionPlanDto) {}

  /**
   * 送不出去時說出**第一個**擋住它的理由；送得出去時 `null`。
   *
   * 一次只說一個，與這張表單其餘每一條同一個理由：使用者一次只改得動一格。
   */
  get rejection(): string | null {
    // 押多少先問，因為它是這五格裡唯一一個**別的地方也在用**的規則——
    // 兩張表單對同一個數字必須給出同一句話。
    try {
      new PositionSizingDomain(
        this.positionPlan.sizingMode, this.positionPlan.sizingValue).validate()
    }
    catch (error: unknown) {
      if (error instanceof BacktestFieldError) {
        return error.message
      }

      throw error
    }

    // 兩個距離的規則也是**委派**出去的，與上面押多少那一段同一個理由：
    // 回測那一列現在也在問同樣兩個距離，而同一個 150 在兩張表單上
    // 必須得到同一句話。
    const exitRejection = new ExitDistanceDomain(this.positionPlan.stopLossPercentage, '停損距離')
      .validationMessage()
      ?? new ExitDistanceDomain(this.positionPlan.takeProfitPercentage, '停利距離')
        .validationMessage()
    if (exitRejection !== null) {
      return exitRejection
    }

    // 只有合約機器人有槓桿；現貨那一台是 null，什麼都不問。措辭與交易服務一字不差——
    // 有人打 0.5 是有意思的，默默當成一倍等於把他要的放大一倍。
    const leverage = this.positionPlan.leverage
    if (leverage !== null && (leverage.isNaN() || leverage.lessThan(MINIMUM_LEVERAGE))) {
      return '槓桿倍數不得小於 1 倍'
    }

    return null
  }

  get isSendable(): boolean {
    return this.rejection === null
  }
}
