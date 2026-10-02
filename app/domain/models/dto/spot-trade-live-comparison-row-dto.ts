import type { SpotTradePerformanceDto } from '~/domain/models/dto/spot-trade-performance-dto'
import type { TradeFigureTone } from '~/domain/models/vo/trade-figure-vo'
import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class SpotTradeLiveComparisonRowDto {
  constructor(
    public readonly symbol: string,
    public readonly marketLabel: LocalizedTextVo,
    public readonly live: SpotTradePerformanceDto,
    public readonly backtest: SpotTradePerformanceDto | null,
    public readonly backtestUnavailableMessage: LocalizedTextVo | null,
    public readonly liveWinRateTone: TradeFigureTone,
    public readonly verdictLabel: LocalizedTextVo,
    public readonly verdictTone: TradeBadgeTone,
  ) {}
}
