import type { BacktestRequestDto } from '~/domain/models/dto/backtest-request-dto'
import type { TradingStrategyBacktestRequestDto } from '~/domain/models/dto/trading-strategy-backtest-request-dto'
import { BacktestTimeRangeDomain } from '~/domain/models/domains/backtest-time-range-domain'
import { BacktestInitialCapitalDomain } from '~/domain/models/domains/backtest-initial-capital-domain'
import { PositionSizingDomain } from '~/domain/models/domains/position-sizing-domain'
import { BacktestExitLevelsDomain } from '~/domain/models/domains/backtest-exit-levels-domain'
import { BacktestTransactionCostsDomain } from '~/domain/models/domains/backtest-transaction-costs-domain'
import { BacktestValidationStartDomain } from '~/domain/models/domains/backtest-validation-start-domain'

/**
 * Domain Model：**兩種重演共有的那幾件事**——哪一段期間、一開始多少錢、每次押多少、
 * 停在哪裡、付多少——以及它們送不送得出去。
 *
 * 它存在的理由是一件觀察得到的事：這幾組規則在兩個請求模型裡**一字不差地寫了兩遍**。
 * 它們一組一組長出來，而每一刀都在兩個地方各加四行、各加一個 import。
 *
 * 呼叫端因此從「依序建幾個模型、各叫一次 validate」變成問一句話：
 * **這一次的條件送不送得出去。** 順序與欄位對照全部在這裡面。
 *
 * **它不管兩種重演各自獨有的那幾件事**——市場、算式、指標值種類、那一份交易策略的
 * 識別碼——因為那些正是兩者的差別所在，而把差別也收進來只會讓這裡長出
 * 「如果是那一種就……」的分支。
 */
export class BacktestConditionsDomain {
  /**
   * 兩種請求的 DTO 都收得下，因為它們在這幾組上的欄位名一模一樣。
   */
  constructor(
    private readonly requestDto: BacktestRequestDto | TradingStrategyBacktestRequestDto,
  ) {}

  /**
   * 講不通就丟一個指著某一格的哨兵錯誤。
   *
   * 一次只說一個理由，與這張表單上每一條同一個理由：使用者一次只改得動一格。
   * 順序就是表單由上往下的順序——他會先看到最上面那一句。
   */
  validate(): void {
    new BacktestTimeRangeDomain(this.requestDto.startTime, this.requestDto.endTime).validate()

    // 驗證起點緊跟在起訖之後：畫面上它就擺在那兩格下面，而它的規則也是關於那兩格。
    new BacktestValidationStartDomain(
      this.requestDto.validationStartTime, this.requestDto.startTime, this.requestDto.endTime).validate()

    new BacktestInitialCapitalDomain(this.requestDto.initialCapital).validate()

    new PositionSizingDomain(
      this.requestDto.positionSizingMode, this.requestDto.positionSizingValue).validate()

    new BacktestExitLevelsDomain(
      this.requestDto.stopLossPercentage, this.requestDto.takeProfitPercentage).validate()

    new BacktestTransactionCostsDomain(
      this.requestDto.entryCostPercentage, this.requestDto.exitCostPercentage).validate()
  }
}
