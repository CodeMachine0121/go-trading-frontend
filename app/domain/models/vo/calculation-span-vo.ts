import { ObservationWindowVo } from '~/domain/models/vo/observation-window-vo'

/** 「多長」的單位。有限的三種，所以是字面量聯合而不是自由字串。 */
export type CalculationSpanUnit = 'minute' | 'hour' | 'day'

const MILLISECONDS_PER_MINUTE = 60 * 1000

const MINUTES_PER_UNIT: Record<CalculationSpanUnit, number> = {
  minute: 1,
  hour: 60,
  day: 24 * 60,
}

/**
 * VO：指標計算畫面上「要看多長」——一個數字配一個單位。不可變。
 *
 * 它取代了原本的「計算根數」。使用者說得出口的是「最近兩小時」，不是「24 根」——
 * 而「24」還會隨彙總刻度改變意義：同樣的 24 根，在五分鐘刻度是兩小時，
 * 在一天刻度是快一個月。
 *
 * **做成數字配單位，而不是一份固定清單**，因為固定清單永遠有人要的那一個不在上面，
 * 而「多長」天生就是一個數字配一個單位。
 *
 * **它與「這條線要回看幾根」是兩件不同的事**：這裡說的是使用者想看多長一段，
 * 回看幾根是那支算式自己的旋鈕。使用者從來不必回答「畫面上要幾根」。
 *
 * **刻意不與圖表的顯示區間共用。** 兩邊換算格數的算法一模一樣，但輸入不同：
 * 圖表那邊的長度由兩個時刻相減得出，這裡是使用者自己打出來的。
 * 併成一個，就得讓其中一邊憑空造出兩個時刻。
 */
export class CalculationSpanVo {
  constructor(
    public readonly amount: number,
    public readonly unit: CalculationSpanUnit,
  ) {}

  get minutes(): number {
    return this.amount * MINUTES_PER_UNIT[this.unit]
  }

  /**
   * 這麼長一段，從某一刻往回推出來的那一段行情。
   *
   * 終點是 `null`——這個畫面問的一律是「最近多久」，而「最近」的右端就是現在，
   * 那正是系統在未指定時採用的答案。送一個算出來的此刻過去，只會多一個會過期的數字。
   *
   * **這裡刻意不回答「這一段有幾格」。** 那取決於這段時間裡市場實際開了多久：
   * 同樣的「最近一天」，全天候市場是一整天，會收盤的市場只有一個交易日的四個半小時。
   * 有幾格是系統的答案，不是一道除法。
   */
  toObservationWindow(now: Date): ObservationWindowVo {
    return new ObservationWindowVo(
      new Date(now.getTime() - this.minutes * MILLISECONDS_PER_MINUTE), null)
  }

  /** 這一段哪裡不對——沒有就是 `null`。 */
  validationMessage(): string | null {
    if (!Number.isInteger(this.amount) || this.amount < 1) {
      return '要看多長必須是大於零的整數'
    }

    return null
  }
}

/** 打開畫面時預先填好的那一段，省一次輸入。 */
export const DEFAULT_CALCULATION_SPAN = new CalculationSpanVo(1, 'hour')
