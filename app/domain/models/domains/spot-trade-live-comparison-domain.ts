import type Decimal from 'decimal.js'
import type { SpotTradeLiveComparison } from '~/domain/models/entities/spot-trade-live-comparison'
import type { SpotTradePerformance } from '~/domain/models/entities/spot-trade-performance'
import { SpotTradeLiveComparisonDto } from '~/domain/models/dto/spot-trade-live-comparison-dto'
import { SpotTradeLiveComparisonRowDto } from '~/domain/models/dto/spot-trade-live-comparison-row-dto'
import { SpotTradePerformanceDto } from '~/domain/models/dto/spot-trade-performance-dto'
import { SpotTradeMarketDomain } from '~/domain/models/domains/spot-trade-market-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'

const NOT_APPLICABLE_TEXT = '不適用'
const TRADING_STRATEGY_DELETED_NOTICE = '交易策略已刪除，無法重演'
const NO_CLOSED_TRADES_NOTICE = '還沒有已平倉的實單可以對照'
const COST_NOTE = '現貨不設手續費率，重演不計成本'
const NO_VERDICT_LABEL = '無法比較'
const KEEPING_UP_LABEL = '不低於回測'
const PERCENT = 100
const SLIPPAGE_FRACTION_DIGITS = 2

export class SpotTradeLiveComparisonDomain {
  constructor(private readonly comparison: SpotTradeLiveComparison) {}

  toDto(): SpotTradeLiveComparisonDto {
    const noClosedTradesNotice = this.comparison.rows.length === 0 ? NO_CLOSED_TRADES_NOTICE : null
    const strategySlippage = this.comparison.averageEntrySlippagePercentage

    return new SpotTradeLiveComparisonDto(
      this.comparison.tradingStrategyName,
      this.comparison.tradingStrategyDeleted ? TRADING_STRATEGY_DELETED_NOTICE : noClosedTradesNotice,
      this.comparison.rows.map((row) => {
        const liveWinRate = row.live.winRate
        const backtestWinRate = row.backtest?.winRate ?? null
        const gapPoints = liveWinRate === null || backtestWinRate === null
          ? null
          : Math.round((backtestWinRate - liveWinRate) * PERCENT)
        const lagging = gapPoints !== null && gapPoints > 0
        const failureMessage = row.backtest === null
          ? `${row.backtestFailureReason ?? '重演沒有結果'}，無法重演`
          : null
        const verdictLabel = gapPoints === null
          ? NO_VERDICT_LABEL
          : (lagging ? `比回測低 ${gapPoints} 個百分點` : KEEPING_UP_LABEL)
        const verdictTone = gapPoints === null ? 'neutral' : (lagging ? 'danger' : 'success')

        return new SpotTradeLiveComparisonRowDto(
          row.symbol,
          new SpotTradeMarketDomain(row.market).label,
          this.performanceDto(row.live),
          row.backtest === null ? null : this.performanceDto(row.backtest),
          this.comparison.tradingStrategyDeleted ? TRADING_STRATEGY_DELETED_NOTICE : failureMessage,
          lagging ? 'danger' : 'neutral',
          verdictLabel,
          verdictTone,
        )
      }),
      this.comparison.rows.length === 0
        ? null
        : strategySlippage === null
          ? '整份策略平均進場滑點：不適用（沒有來自機器人連結的實單）'
          : `整份策略平均進場滑點 ${this.slippageText(strategySlippage)}，以 ${this.comparison.entrySlippageTradeCount} 筆計`,
      COST_NOTE,
    )
  }

  private performanceDto(performance: SpotTradePerformance): SpotTradePerformanceDto {
    return new SpotTradePerformanceDto(
      `${performance.closedTradeCount} 筆`,
      performance.winRate === null ? NOT_APPLICABLE_TEXT : `${Math.round(performance.winRate * PERCENT)}%`,
      performance.averageEntrySlippagePercentage === null
        ? NOT_APPLICABLE_TEXT
        : this.slippageText(performance.averageEntrySlippagePercentage),
      performance.entrySlippageTradeCount > 0 ? `以 ${performance.entrySlippageTradeCount} 筆計` : null,
    )
  }

  private slippageText(percentage: Decimal): string {
    return new JournalNumberDomain(percentage).percentage(SLIPPAGE_FRACTION_DIGITS)
  }
}
