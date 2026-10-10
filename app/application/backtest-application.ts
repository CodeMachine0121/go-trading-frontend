import type Decimal from 'decimal.js'
import type { BacktestService } from '~/domain/service/backtest-service'
import type { BacktestRequestDto } from '~/domain/models/dto/backtest-request-dto'
import type { TradingStrategyBacktestRequestDto } from '~/domain/models/dto/trading-strategy-backtest-request-dto'
import type { BacktestRunDto } from '~/domain/models/dto/backtest-run-dto'
import type { BacktestRunPageDto } from '~/domain/models/dto/backtest-run-page-dto'
import type { BacktestRunDetailDto } from '~/domain/models/dto/backtest-run-detail-dto'
import type { BacktestRunListQueryDto } from '~/domain/models/dto/backtest-run-list-query-dto'
import type { BacktestRunStatusOptionDto } from '~/domain/models/dto/backtest-run-status-option-dto'
import type { BacktestTimeRangeDto } from '~/domain/models/dto/backtest-time-range-dto'
import type { PositionSizingModeOptionDto } from '~/domain/models/dto/position-sizing-mode-option-dto'
import type { BacktestRuleDto } from '~/domain/models/dto/backtest-rule-dto'
import type { SignalReadingDto } from '~/domain/models/dto/signal-reading-dto'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'
import type { ContractBacktestTermsDto } from '~/domain/models/dto/contract-backtest-terms-dto'
import type { ContractTradingModeOptionDto } from '~/domain/models/dto/contract-trading-mode-option-dto'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'
import type { FillTimingOptionDto } from '~/domain/models/dto/fill-timing-option-dto'

/** Application：回測的用例編排，全程只碰 DTO。 */
export class BacktestApplication {
  constructor(private readonly backtestService: BacktestService) {}

  async submitBacktest(backtestRequestDto: BacktestRequestDto): Promise<BacktestRunDto> {
    return this.backtestService.submitBacktest(backtestRequestDto)
  }

  async submitTradingStrategyBacktest(
    requestDto: TradingStrategyBacktestRequestDto,
  ): Promise<BacktestRunDto> {
    return this.backtestService.submitTradingStrategyBacktest(requestDto)
  }

  async submitContractBacktest(
    backtestRequestDto: BacktestRequestDto, termsDto: ContractBacktestTermsDto,
  ): Promise<BacktestRunDto> {
    return this.backtestService.submitContractBacktest(backtestRequestDto, termsDto)
  }

  async submitContractTradingStrategyBacktest(
    requestDto: TradingStrategyBacktestRequestDto, termsDto: ContractBacktestTermsDto,
  ): Promise<BacktestRunDto> {
    return this.backtestService.submitContractTradingStrategyBacktest(requestDto, termsDto)
  }

  async listRuns(queryDto: BacktestRunListQueryDto): Promise<BacktestRunPageDto> {
    return this.backtestService.listRuns(queryDto)
  }

  async refreshRuns(queryDto: BacktestRunListQueryDto): Promise<BacktestRunPageDto> {
    return this.backtestService.refreshRuns(queryDto)
  }

  grownQuery(queryDto: BacktestRunListQueryDto): BacktestRunListQueryDto {
    return this.backtestService.grownQuery(queryDto)
  }

  canShowMoreRuns(queryDto: BacktestRunListQueryDto, shownCount: number, totalCount: number): boolean {
    return this.backtestService.canShowMoreRuns(queryDto, shownCount, totalCount)
  }

  async getRun(id: number): Promise<BacktestRunDetailDto> {
    return this.backtestService.getRun(id)
  }

  async cancelRun(id: number): Promise<BacktestRunDto> {
    return this.backtestService.cancelRun(id)
  }

  listBacktestRunStatusOptions(): BacktestRunStatusOptionDto[] {
    return this.backtestService.listBacktestRunStatusOptions()
  }

  listContractTradingModeOptions(): ContractTradingModeOptionDto[] {
    return this.backtestService.listContractTradingModeOptions()
  }

  listFillTimingOptions(): FillTimingOptionDto[] {
    return this.backtestService.listFillTimingOptions()
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
