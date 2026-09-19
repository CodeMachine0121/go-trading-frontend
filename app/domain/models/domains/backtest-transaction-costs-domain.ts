import type Decimal from 'decimal.js'
import { TransactionCostRateDomain } from '~/domain/models/domains/transaction-cost-rate-domain'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

/**
 * Domain Model：一次重演要付的那兩個費率。
 *
 * 兩格都可以留白，而**留白就是完全不收費**——不是套用一個常見的費率。
 * 不計的那一張成績單描述的是一個交易免費的世界，而它偏樂觀的程度
 * 與那支策略多常交易成正比：台股一趟進出約 0.47%，一年兩百趟吃掉六成本金。
 *
 * **出場那一格留白時沿用進場**，這條由後端執行，畫面只負責把它說出來。
 * 它與隔壁那一組出場價位**不一樣**（那兩格各自獨立、各自留白即不模擬），
 * 而兩組就擺在一起——不說出來，使用者會把隔壁那一組的規則帶過來，
 * 以為自己設了「進場收費、出場免費」。
 *
 * 拒絕指向**一格**（`transactionCosts`）而不是兩格：這兩格在畫面上是併排填的一組，
 * 而拒絕的句子已經說出了是進場還是出場那一格。後端也是這樣回的。
 */
export class BacktestTransactionCostsDomain {
  constructor(
    private readonly entryCostPercentage: Decimal,
    private readonly exitCostPercentage: Decimal,
  ) {}

  /**
   * 講不通就丟一個指著這一組的哨兵錯誤。
   *
   * 形狀與出場價位那一個一字不差，所以兩個請求模型對它的用法與對那一個相同——
   * 一條新規則不必在兩處各學一次怎麼被呼叫。
   *
   * 一次只說一個理由，與這張表單其餘每一條同一個理由：使用者一次只改得動一格。
   */
  validate(): void {
    const rejection
      = new TransactionCostRateDomain(
        this.entryCostPercentage, '進場成本率').validationMessage()
      ?? new TransactionCostRateDomain(
        this.exitCostPercentage, '出場成本率').validationMessage()

    if (rejection !== null) {
      throw new BacktestFieldError('transactionCosts', rejection)
    }
  }
}
