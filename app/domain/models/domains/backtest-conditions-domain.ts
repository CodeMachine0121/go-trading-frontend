import type { TradingMode } from '~/domain/models/vo/trading-mode-vo'
import type { BacktestRequestDto } from '~/domain/models/dto/backtest-request-dto'
import type { TradingStrategyBacktestRequestDto } from '~/domain/models/dto/trading-strategy-backtest-request-dto'
import { BacktestTimeRangeDomain } from '~/domain/models/domains/backtest-time-range-domain'
import { BacktestInitialCapitalDomain } from '~/domain/models/domains/backtest-initial-capital-domain'
import { PositionSizingDomain } from '~/domain/models/domains/position-sizing-domain'
import { BacktestExitLevelsDomain } from '~/domain/models/domains/backtest-exit-levels-domain'
import { BacktestTransactionCostsDomain } from '~/domain/models/domains/backtest-transaction-costs-domain'
import { BacktestLeverageDomain } from '~/domain/models/domains/backtest-leverage-domain'

/**
 * Domain Model：**兩種重演共有的那幾件事**——哪一段期間、一開始多少錢、每次押多少、
 * 停在哪裡、付多少、借多少——以及它們送不送得出去。
 *
 * 它存在的理由是一件觀察得到的事：這六組規則在兩個請求模型裡**一字不差地寫了兩遍**。
 * 它們一組一組長出來（出場價位、交易成本、槓桿各一刀），而每一刀都在兩個地方
 * 各加四行、各加一個 import。第七組還會再來一次。
 *
 * 呼叫端因此從「依序建六個模型、各叫一次 validate」變成問一句話：
 * **這一次的條件送不送得出去。** 順序、欄位對照、哪一組要不要交易模式，全部在這裡面。
 *
 * **它不管兩種重演各自獨有的那幾件事**——市場、算式、指標值種類、那一份交易策略的
 * 識別碼——因為那些正是兩者的差別所在，而把差別也收進來只會讓這裡長出
 * 「如果是那一種就……」的分支。
 */
export class BacktestConditionsDomain {
  /**
   * 兩種請求的 DTO 都收得下，因為它們在這六組上的欄位名一模一樣。
   *
   * 交易模式**分開傳**而不是從 DTO 上讀，因為只有一種重演說得出它：
   * 重演一份交易策略時它是那一份自己記著的，這張表單看不到。`null` 是那件事
   * 說出口的樣子——寫成選填參數的話，它會變成一個某天被忘記傳的東西。
   */
  constructor(
    private readonly requestDto: BacktestRequestDto | TradingStrategyBacktestRequestDto,
    private readonly tradingMode: TradingMode | null,
  ) {}

  /**
   * 講不通就丟一個指著某一格的哨兵錯誤。
   *
   * 一次只說一個理由，與這張表單上每一條同一個理由：使用者一次只改得動一格。
   * 順序就是表單由上往下的順序——他會先看到最上面那一句。
   */
  validate(): void {
    new BacktestTimeRangeDomain(this.requestDto.startTime, this.requestDto.endTime).validate()

    new BacktestInitialCapitalDomain(this.requestDto.initialCapital).validate()

    new PositionSizingDomain(
      this.requestDto.positionSizingMode, this.requestDto.positionSizingValue).validate()

    new BacktestExitLevelsDomain(
      this.requestDto.stopLossPercentage, this.requestDto.takeProfitPercentage).validate()

    new BacktestTransactionCostsDomain(
      this.requestDto.entryCostPercentage, this.requestDto.exitCostPercentage).validate()

    new BacktestLeverageDomain(
      this.requestDto.leverage, this.requestDto.maintenanceMarginRate,
      this.tradingMode).validate()
  }
}
