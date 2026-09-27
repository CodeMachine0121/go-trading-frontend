import type { ContractTradePerformanceDto } from '~/domain/models/dto/contract-trade-performance-dto'
import type { ContractTradeFigureTone } from '~/domain/models/vo/contract-trade-figure-vo'

export class ContractTradeLiveComparisonRowDto {
  constructor(
    public readonly symbol: string,
    public readonly live: ContractTradePerformanceDto,
    public readonly backtest: ContractTradePerformanceDto | null,
    public readonly backtestUnavailableMessage: string | null,
    public readonly liveWinRateTone: ContractTradeFigureTone,
    public readonly winRateGapText: string | null,
  ) {}
}
