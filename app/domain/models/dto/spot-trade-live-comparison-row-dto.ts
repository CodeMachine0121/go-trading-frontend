import type { SpotTradePerformanceDto } from '~/domain/models/dto/spot-trade-performance-dto'
import type { TradeFigureTone } from '~/domain/models/vo/trade-figure-vo'
import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'

export class SpotTradeLiveComparisonRowDto {
  constructor(
    public readonly symbol: string,
    public readonly marketLabel: string,
    public readonly live: SpotTradePerformanceDto,
    public readonly backtest: SpotTradePerformanceDto | null,
    public readonly backtestUnavailableMessage: string | null,
    public readonly liveWinRateTone: TradeFigureTone,
    public readonly verdictLabel: string,
    public readonly verdictTone: TradeBadgeTone,
  ) {}
}
