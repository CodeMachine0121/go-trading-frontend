import type { ContractTradeLiveComparison } from '~/domain/models/entities/contract-trade-live-comparison'
import type { ContractTradePerformance } from '~/domain/models/entities/contract-trade-performance'
import { ContractTradeLiveComparisonDto } from '~/domain/models/dto/contract-trade-live-comparison-dto'
import { ContractTradeLiveComparisonRowDto } from '~/domain/models/dto/contract-trade-live-comparison-row-dto'
import { ContractTradePerformanceDto } from '~/domain/models/dto/contract-trade-performance-dto'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'
import type Decimal from 'decimal.js'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

const NOT_APPLICABLE_TEXT = new LocalizedTextVo('不適用', 'N/A')
const TRADING_STRATEGY_DELETED_NOTICE = new LocalizedTextVo(
  '交易策略已刪除，無法重演', 'The trading strategy was deleted, so it cannot be replayed')
const NO_CLOSED_TRADES_NOTICE = new LocalizedTextVo(
  '還沒有已平倉的實單可以對照', 'No closed live trades to compare yet')
const PERCENT = 100
const SLIPPAGE_FRACTION_DIGITS = 2
const NO_VERDICT_LABEL = new LocalizedTextVo('無法比較', 'Cannot compare')
const KEEPING_UP_LABEL = new LocalizedTextVo('不低於回測', 'Not below backtest')

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
        const gapText = new LocalizedTextVo(
          `比回測低 ${gapPoints} 個百分點`, `${gapPoints} percentage points below backtest`)
        const verdictLabel = gapPoints === null ? NO_VERDICT_LABEL : (lagging ? gapText : KEEPING_UP_LABEL)
        const verdictTone = gapPoints === null ? 'neutral' : (lagging ? 'danger' : 'success')
        // 後端給的重演失敗原因是原文，不翻；只有操作台自己補的那半句跟著語言換。
        const failureReason = row.backtestFailureReason
        const failureMessage = row.backtest === null
          ? failureReason === null
            ? new LocalizedTextVo('重演沒有結果，無法重演', 'The replay returned no result, so nothing can be compared')
            : new LocalizedTextVo(`${failureReason}，無法重演`, `${failureReason}, so nothing can be compared`)
          : null

        return new ContractTradeLiveComparisonRowDto(
          row.symbol,
          this.performanceDto(row.live),
          row.backtest === null ? null : this.performanceDto(row.backtest),
          this.comparison.tradingStrategyDeleted ? TRADING_STRATEGY_DELETED_NOTICE : failureMessage,
          lagging ? 'danger' : 'neutral',
          lagging ? gapText : null,
          verdictLabel,
          verdictTone,
        )
      }),
      this.comparison.rows.length === 0
        ? null
        : this.comparison.averageEntrySlippagePercentage === null
          ? new LocalizedTextVo(
              '整份策略平均進場滑點：不適用（沒有來自機器人連結的實單）',
              'Strategy-wide avg entry slippage: N/A (no live trades from bot links)')
          : new LocalizedTextVo(
              `整份策略平均進場滑點 ${this.slippageText(this.comparison.averageEntrySlippagePercentage)}，以 ${this.comparison.entrySlippageTradeCount} 筆計`,
              `Strategy-wide avg entry slippage ${this.slippageText(this.comparison.averageEntrySlippagePercentage)}, across ${this.comparison.entrySlippageTradeCount} ${this.comparison.entrySlippageTradeCount === 1 ? 'trade' : 'trades'}`),
    )
  }

  private performanceDto(performance: ContractTradePerformance): ContractTradePerformanceDto {
    return new ContractTradePerformanceDto(
      new LocalizedTextVo(
        `${performance.closedTradeCount} 筆`,
        `${performance.closedTradeCount} ${performance.closedTradeCount === 1 ? 'trade' : 'trades'}`),
      this.ratioText(performance.winRate),
      this.ratioText(performance.longWinRate),
      this.ratioText(performance.shortWinRate),
      performance.averageEntrySlippagePercentage === null
        ? NOT_APPLICABLE_TEXT
        : new UntranslatedTextVo(this.slippageText(performance.averageEntrySlippagePercentage)),
      performance.entrySlippageTradeCount > 0
        ? new LocalizedTextVo(
            `以 ${performance.entrySlippageTradeCount} 筆計`, `across ${performance.entrySlippageTradeCount} ${performance.entrySlippageTradeCount === 1 ? 'trade' : 'trades'}`)
        : null,
    )
  }

  private slippageText(percentage: Decimal): string {
    return new JournalNumberDomain(percentage).percentage(SLIPPAGE_FRACTION_DIGITS)
  }

  private ratioText(ratio: number | null): LocalizedTextVo {
    if (ratio === null) {
      return NOT_APPLICABLE_TEXT
    }

    return new UntranslatedTextVo(`${Math.round(ratio * PERCENT)}%`)
  }
}
