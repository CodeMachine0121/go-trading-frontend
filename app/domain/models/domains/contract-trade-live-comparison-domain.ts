import type { ContractTradeLiveComparison } from '~/domain/models/entities/contract-trade-live-comparison'
import type { ContractTradePerformance } from '~/domain/models/entities/contract-trade-performance'
import { ContractTradeLiveComparisonDto } from '~/domain/models/dto/contract-trade-live-comparison-dto'
import { ContractTradeLiveComparisonRowDto } from '~/domain/models/dto/contract-trade-live-comparison-row-dto'
import { ContractTradePerformanceDto } from '~/domain/models/dto/contract-trade-performance-dto'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'
import type Decimal from 'decimal.js'

const NOT_APPLICABLE_TEXT = '不適用'
const TRADING_STRATEGY_DELETED_NOTICE = '交易策略已刪除，無法重演'
const NO_CLOSED_TRADES_NOTICE = '還沒有已平倉的實單可以對照'
const PERCENT = 100
const SLIPPAGE_FRACTION_DIGITS = 2
const NO_VERDICT_LABEL = '無法比較'
const KEEPING_UP_LABEL = '不低於回測'

export class ContractTradeLiveComparisonDomain {
  constructor(private readonly comparison: ContractTradeLiveComparison) {}

  toDto(): ContractTradeLiveComparisonDto {
    const noClosedTradesNotice = this.comparison.rows.length === 0 ? NO_CLOSED_TRADES_NOTICE : null

    return new ContractTradeLiveComparisonDto(
      this.comparison.tradingStrategyName,
      this.comparison.tradingStrategyDeleted ? TRADING_STRATEGY_DELETED_NOTICE : noClosedTradesNotice,
      this.comparison.rows.map((row) => {
        const liveWinRate = row.live.winRate
        const backtestWinRate = row.backtest?.winRate ?? null
        const gapPoints = liveWinRate === null || backtestWinRate === null
          ? null
          : Math.round((backtestWinRate - liveWinRate) * PERCENT)
        const lagging = gapPoints !== null && gapPoints > 0
        const verdictLabel = gapPoints === null ? NO_VERDICT_LABEL : (lagging ? `比回測低 ${gapPoints} 個百分點` : KEEPING_UP_LABEL)
        const verdictTone = gapPoints === null ? 'neutral' : (lagging ? 'danger' : 'success')
        const failureMessage = row.backtest === null
          ? `${row.backtestFailureReason ?? '重演沒有結果'}，無法重演`
          : null

        return new ContractTradeLiveComparisonRowDto(
          row.symbol,
          this.performanceDto(row.live),
          row.backtest === null ? null : this.performanceDto(row.backtest),
          this.comparison.tradingStrategyDeleted ? TRADING_STRATEGY_DELETED_NOTICE : failureMessage,
          lagging ? 'danger' : 'neutral',
          lagging ? `比回測低 ${gapPoints} 個百分點` : null,
          verdictLabel,
          verdictTone,
        )
      }),
      this.comparison.rows.length === 0
        ? null
        : this.comparison.averageEntrySlippagePercentage === null
          ? '整份策略平均進場滑點：不適用（沒有來自機器人連結的實單）'
          : `整份策略平均進場滑點 ${this.slippageText(this.comparison.averageEntrySlippagePercentage)}，以 ${this.comparison.entrySlippageTradeCount} 筆計`,
    )
  }

  private performanceDto(performance: ContractTradePerformance): ContractTradePerformanceDto {
    return new ContractTradePerformanceDto(
      `${performance.closedTradeCount} 筆`,
      this.ratioText(performance.winRate),
      this.ratioText(performance.longWinRate),
      this.ratioText(performance.shortWinRate),
      performance.averageEntrySlippagePercentage === null
        ? NOT_APPLICABLE_TEXT
        : this.slippageText(performance.averageEntrySlippagePercentage),
      performance.entrySlippageTradeCount > 0 ? `以 ${performance.entrySlippageTradeCount} 筆計` : null,
    )
  }

  private slippageText(percentage: Decimal): string {
    return new JournalNumberDomain(percentage).percentage(SLIPPAGE_FRACTION_DIGITS)
  }

  private ratioText(ratio: number | null): string {
    return ratio === null ? NOT_APPLICABLE_TEXT : `${Math.round(ratio * PERCENT)}%`
  }
}
