import type { ContractTradePerformanceDto } from '~/domain/models/dto/contract-trade-performance-dto'
import type { TradeFigureTone } from '~/domain/models/vo/trade-figure-vo'
import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class ContractTradeLiveComparisonRowDto {
  constructor(
    public readonly symbol: string,
    public readonly live: ContractTradePerformanceDto,
    public readonly backtest: ContractTradePerformanceDto | null,
    public readonly backtestUnavailableMessage: LocalizedTextVo | null,
    public readonly liveWinRateTone: TradeFigureTone,
    public readonly winRateGapText: LocalizedTextVo | null,
    public readonly verdictLabel: LocalizedTextVo,
    public readonly verdictTone: TradeBadgeTone,
  ) {}
}
