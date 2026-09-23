import type Decimal from 'decimal.js'
import type { BacktestService } from '~/domain/service/backtest-service'
import type { BacktestRequestDto } from '~/domain/models/dto/backtest-request-dto'
import type { TradingStrategyBacktestRequestDto } from '~/domain/models/dto/trading-strategy-backtest-request-dto'
import type { BacktestResultDto } from '~/domain/models/dto/backtest-result-dto'
import type { BacktestTimeRangeDto } from '~/domain/models/dto/backtest-time-range-dto'
import type { PositionSizingModeOptionDto } from '~/domain/models/dto/position-sizing-mode-option-dto'
import type { BacktestRuleDto } from '~/domain/models/dto/backtest-rule-dto'
import type { SignalReadingDto } from '~/domain/models/dto/signal-reading-dto'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'
import type { ContractBacktestTermsDto } from '~/domain/models/dto/contract-backtest-terms-dto'
import type { ContractTradingModeOptionDto } from '~/domain/models/dto/contract-trading-mode-option-dto'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'

/** Application：回測的用例編排，全程只碰 DTO。 */
export class BacktestApplication {
  constructor(private readonly backtestService: BacktestService) {}

  async runBacktest(backtestRequestDto: BacktestRequestDto): Promise<BacktestResultDto> {
    return this.backtestService.runBacktest(backtestRequestDto)
  }

  async runTradingStrategyBacktest(
    requestDto: TradingStrategyBacktestRequestDto,
  ): Promise<BacktestResultDto> {
    return this.backtestService.runTradingStrategyBacktest(requestDto)
  }

  async runContractBacktest(
    backtestRequestDto: BacktestRequestDto, termsDto: ContractBacktestTermsDto,
  ): Promise<BacktestResultDto> {
    return this.backtestService.runContractBacktest(backtestRequestDto, termsDto)
  }

  async runContractTradingStrategyBacktest(
    requestDto: TradingStrategyBacktestRequestDto, termsDto: ContractBacktestTermsDto,
  ): Promise<BacktestResultDto> {
    return this.backtestService.runContractTradingStrategyBacktest(requestDto, termsDto)
  }

  listContractTradingModeOptions(): ContractTradingModeOptionDto[] {
    return this.backtestService.listContractTradingModeOptions()
  }

  defaultTimeRange(now: Date): BacktestTimeRangeDto {
    return this.backtestService.defaultTimeRange(now)
  }

  defaultInitialCapital(): Decimal {
    return this.backtestService.defaultInitialCapital()
  }

  defaultPositionSizingMode(): PositionSizingMode {
    return this.backtestService.defaultPositionSizingMode()
  }

  listPositionSizingModeOptions(): PositionSizingModeOptionDto[] {
    return this.backtestService.listPositionSizingModeOptions()
  }

  listBacktestRules(marketDataKind: MarketDataKind = 'kCandle'): BacktestRuleDto[] {
    return this.backtestService.listBacktestRules(marketDataKind)
  }

  listSignalReadings(): SignalReadingDto[] {
    return this.backtestService.listSignalReadings()
  }
}
