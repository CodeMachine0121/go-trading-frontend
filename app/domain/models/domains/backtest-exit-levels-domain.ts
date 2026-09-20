import type Decimal from 'decimal.js'
import { ExitDistanceDomain } from '~/domain/models/domains/exit-distance-domain'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

/**
 * Domain Model：一次重演要模擬的那兩個出場距離。
 *
 * 兩個都可以留白，而**留白就是完全不模擬那個出場**——不是套用一個常見的預設值。
 * 這一點是這一組欄位最容易被誤會的地方，而誤會的代價是使用者以為他已經
 * 拿一張算進止損的成績單對過帳了。
 *
 * 兩條規則本身**委派**給兩張表單共用的那一份，與這個專案既有的手法一致：
 * 機器人那張表單問的是同樣兩個距離，而同一個 150 在兩張表單上必須得到同一句話。
 *
 * 拒絕指向**一格**（`exitLevels`）而不是兩格：這兩格在畫面上是併排填的一組，
 * 而拒絕的句子已經說出了是止損還是止盈那一格。後端也是這樣回的。
 *
 * **這裡說「止損」而不是「停損」**：後端把這兩組詞分成兩件事——回測的距離
 * 從**進場價**量起（止損距離／止盈距離），機器人建議的部位從**最新價**量起
 * （停損距離／停利距離）。同一個模型（`ExitDistanceDomain`）替兩邊驗證，
 * 但它帶著的那個名字必須是呼叫它的那一邊的名字。
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
      = new ExitDistanceDomain(this.stopLossPercentage, '止損距離').validationMessage()
        ?? new ExitDistanceDomain(this.takeProfitPercentage, '止盈距離').validationMessage()

    if (rejection !== null) {
      throw new BacktestFieldError('exitLevels', rejection)
    }
  }
}
