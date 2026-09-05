import type Decimal from 'decimal.js'
import type { BacktestService } from '~/domain/service/backtest-service'
import type { BacktestRequestDto } from '~/domain/models/dto/backtest-request-dto'
import type { BacktestResultDto } from '~/domain/models/dto/backtest-result-dto'
import type { BacktestTimeRangeDto } from '~/domain/models/dto/backtest-time-range-dto'
import type { PositionSizingModeOptionDto } from '~/domain/models/dto/position-sizing-mode-option-dto'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'

/** Application：回測的用例編排，全程只碰 DTO。 */
export class BacktestApplication {
  constructor(private readonly backtestService: BacktestService) {}

  async runBacktest(backtestRequestDto: BacktestRequestDto): Promise<BacktestResultDto> {
    return this.backtestService.runBacktest(backtestRequestDto)
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
}
