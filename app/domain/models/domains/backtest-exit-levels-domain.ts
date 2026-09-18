import type Decimal from 'decimal.js'
import { ExitDistanceDomain } from '~/domain/models/domains/exit-distance-domain'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

/**
 * Domain Model：一次重演要模擬的那兩個出場距離。
 *
 * 兩個都可以留白，而**留白就是完全不模擬那個出場**——不是套用一個常見的預設值。
 * 這一點是這一組欄位最容易被誤會的地方，而誤會的代價是使用者以為他已經
 * 拿一張算進停損的成績單對過帳了。
 *
 * 兩條規則本身**委派**給兩張表單共用的那一份，與這個專案既有的手法一致：
 * 機器人那張表單問的是同樣兩個距離，而同一個 150 在兩張表單上必須得到同一句話。
 *
 * 拒絕指向**一格**（`exitLevels`）而不是兩格：這兩格在畫面上是併排填的一組，
 * 而拒絕的句子已經說出了是止損還是止盈那一格。後端也是這樣回的。
 */
export class BacktestExitLevelsDomain {
  constructor(
    private readonly stopLossPercentage: Decimal,
    private readonly takeProfitPercentage: Decimal,
  ) {}

  /**
   * 講不通就丟一個指著這一組的哨兵錯誤。
   *
   * 形狀與初始資金、時間區間那兩個模型一字不差，所以兩個請求模型對它的用法
   * 與對那兩個相同——一條新規則不必在兩處各學一次怎麼被呼叫。
   *
   * 一次只說一個理由，與這張表單其餘每一條同一個理由：使用者一次只改得動一格。
   */
  validate(): void {
    const rejection
      = new ExitDistanceDomain(this.stopLossPercentage, '停損距離').validationMessage()
        ?? new ExitDistanceDomain(this.takeProfitPercentage, '停利距離').validationMessage()

    if (rejection !== null) {
      throw new BacktestFieldError('exitLevels', rejection)
    }
  }
}
