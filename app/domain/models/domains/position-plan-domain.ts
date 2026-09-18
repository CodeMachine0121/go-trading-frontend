import Decimal from 'decimal.js'
import type { PositionPlanDto } from '~/domain/models/dto/position-plan-dto'
import { PositionSizingDomain } from '~/domain/models/domains/position-sizing-domain'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

/** 不上槓桿：名目部位就等於押下去的那筆錢。小於它的不是槓桿。 */
const NO_LEVERAGE = new Decimal(1)

/** 距離的上限：整個價格。正好一百允許——荒謬但算得出來；再多價格會變成負數。 */
const WHOLE_PRICE_PERCENTAGE = new Decimal(100)

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

    if (this.positionPlan.leverage.lessThan(NO_LEVERAGE)) {
      // 不讀成「不上槓桿」：打了 0.5 的人是有意思的（大概是半個部位），
      // 而悄悄讀成一倍會在沒有告知的情況下把他要的部位加倍。
      return '槓桿倍數不得小於 1 倍'
    }

    return this.distanceRejection(this.positionPlan.stopLossPercentage, '停損距離')
      ?? this.distanceRejection(this.positionPlan.takeProfitPercentage, '停利距離')
  }

  get isSendable(): boolean {
    return this.rejection === null
  }

  /**
   * 一個出口的距離講不講得通。
   *
   * 兩個出口共用，因為兩邊要擋的是同樣兩件事：負的會跑到價格的另一邊，
   * 超過一百會讓價格變成負數。兩份之後會有一邊放過另一邊擋著的值。
   */
  private distanceRejection(distance: Decimal, name: string): string | null {
    if (distance.isNaN()) {
      return `${name}請填一個數字`
    }

    if (distance.isNegative()) {
      return `${name}不得為負`
    }

    if (distance.greaterThan(WHOLE_PRICE_PERCENTAGE)) {
      return `${name}不得超過 100%——那會讓價格變成負數`
    }

    return null
  }
}
