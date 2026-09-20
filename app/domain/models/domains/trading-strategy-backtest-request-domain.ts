import type Decimal from 'decimal.js'
import type { TradingStrategyBacktestRequestDto } from '~/domain/models/dto/trading-strategy-backtest-request-dto'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'
import { BacktestInitialCapitalDomain } from '~/domain/models/domains/backtest-initial-capital-domain'
import { BacktestTimeRangeDomain } from '~/domain/models/domains/backtest-time-range-domain'
import { BacktestExitLevelsDomain } from '~/domain/models/domains/backtest-exit-levels-domain'
import { BacktestTransactionCostsDomain } from '~/domain/models/domains/backtest-transaction-costs-domain'
import { BacktestLeverageDomain } from '~/domain/models/domains/backtest-leverage-domain'
import { PositionSizingDomain } from '~/domain/models/domains/position-sizing-domain'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

/**
 * Domain Model：一次交易策略回測的請求，建構當下即驗證。
 *
 * 「不合法就不送出」與「說明留在那一格旁邊」是同一條規則的兩半，
 * 所以驗證在這裡而不在畫面上。
 *
 * 它比重演一支腳本少了三樣，而那正是這件事的重點：
 * **算式、彙總刻度與交易模式都不由填表的人決定**。算式是那幾個信號來源各自的，
 * 刻度是它們共同說的，交易模式是那一份交易策略自己記著的——
 * 而它們是不是真的一致，只有後端看得到全部，
 * 所以那一條由後端說、畫面照它說的講。
 */
export class TradingStrategyBacktestRequestDomain {
  readonly tradingStrategyId: number
  readonly symbol: string
  readonly startTime: Date
  readonly endTime: Date
  readonly initialCapital: Decimal
  readonly positionSizingMode: PositionSizingMode
  readonly positionSizingValue: Decimal
  // 出場距離在這裡，而彙總刻度與交易模式不在：那两樣是那份交易策略自己說的，
  // 而一份交易策略對「它的主人能忍多少」沒有意見。
  readonly stopLossPercentage: Decimal
  readonly takeProfitPercentage: Decimal
  // 兩個費率也在這裡，同一個理由：一份交易策略對「它的主人的券商收多少」
  // 沒有意見，而那是坐下來調的時候會換來換去的旋鈕。
  readonly entryCostPercentage: Decimal
  readonly exitCostPercentage: Decimal
  readonly leverage: Decimal
  readonly maintenanceMarginRate: Decimal

  constructor(requestDto: TradingStrategyBacktestRequestDto) {
    if (requestDto.tradingStrategyId === 0) {
      throw new BacktestFieldError('symbol', '請先存下這一份交易策略，才能拿它重演')
    }

    const normalizedSymbol = requestDto.symbol.trim()
    if (normalizedSymbol === '') {
      throw new BacktestFieldError('symbol', '請指定交易標的')
    }

    new BacktestTimeRangeDomain(requestDto.startTime, requestDto.endTime).validate()

    new BacktestInitialCapitalDomain(requestDto.initialCapital).validate()

    new PositionSizingDomain(
      requestDto.positionSizingMode, requestDto.positionSizingValue).validate()

    new BacktestExitLevelsDomain(
      requestDto.stopLossPercentage, requestDto.takeProfitPercentage).validate()

    new BacktestTransactionCostsDomain(
      requestDto.entryCostPercentage, requestDto.exitCostPercentage).validate()

    // 交易模式傳 null——**這條路問不到它**。它是那一份交易策略自己記著的，
    // 這張表單看不到。所以「現貨開不了槓桿」那一條由後端回答，
    // 回來的拒絕會標在同一組旁邊。
    new BacktestLeverageDomain(
      requestDto.leverage, requestDto.maintenanceMarginRate, null).validate()

    this.tradingStrategyId = requestDto.tradingStrategyId
    this.symbol = normalizedSymbol
    this.startTime = requestDto.startTime
    this.endTime = requestDto.endTime
    this.initialCapital = requestDto.initialCapital
    this.positionSizingMode = requestDto.positionSizingMode
    this.positionSizingValue = requestDto.positionSizingValue
    this.stopLossPercentage = requestDto.stopLossPercentage
    this.takeProfitPercentage = requestDto.takeProfitPercentage
    this.entryCostPercentage = requestDto.entryCostPercentage
    this.exitCostPercentage = requestDto.exitCostPercentage
    this.leverage = requestDto.leverage
    this.maintenanceMarginRate = requestDto.maintenanceMarginRate
  }
}
