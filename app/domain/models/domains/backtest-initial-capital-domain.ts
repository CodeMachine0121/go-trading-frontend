import type Decimal from 'decimal.js'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

/**
 * Domain Model：一次重演一開始有多少錢。
 *
 * 它與時間區間、押注方式並列：三件事都是「那一格填的合不合法」，
 * 三件事就都住在自己的模型裡。少了這一個，兩種受測對象各自抄一份同樣的判斷，
 * 而那句話要改的時候只會有一邊被改到。
 *
 * 不是一個數字與零或負數在這裡是同一件事：兩種情況下這次重演都沒有東西可以押。
 */
export class BacktestInitialCapitalDomain {
  constructor(private readonly amount: Decimal) {}

  /** 不合法就當場說在本金那一格旁邊。 */
  validate(): void {
    if (this.amount.isNaN() || this.amount.lessThanOrEqualTo(0)) {
      throw new BacktestFieldError('initialCapital', '請填一個大於零的數。')
    }
  }
}
