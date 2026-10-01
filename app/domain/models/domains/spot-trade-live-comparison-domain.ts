import type Decimal from 'decimal.js'
import type { SpotTradeLiveComparison } from '~/domain/models/entities/spot-trade-live-comparison'
import type { SpotTradePerformance } from '~/domain/models/entities/spot-trade-performance'
import { SpotTradeLiveComparisonDto } from '~/domain/models/dto/spot-trade-live-comparison-dto'
import { SpotTradeLiveComparisonRowDto } from '~/domain/models/dto/spot-trade-live-comparison-row-dto'
import { SpotTradePerformanceDto } from '~/domain/models/dto/spot-trade-performance-dto'
import { SpotTradeMarketDomain } from '~/domain/models/domains/spot-trade-market-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

const NOT_APPLICABLE_TEXT = new LocalizedTextVo('不適用', 'N/A')
const TRADING_STRATEGY_DELETED_NOTICE = new LocalizedTextVo(
  '交易策略已刪除，無法重演', 'The trading strategy was deleted, so it cannot be replayed')
const NO_CLOSED_TRADES_NOTICE = new LocalizedTextVo(
  '還沒有已平倉的實單可以對照', 'No closed live trades to compare yet')
const COST_NOTE = new LocalizedTextVo(
  '現貨不設手續費率，重演不計成本', 'Spot has no fee rate setting, so the replay ignores costs')
const NO_VERDICT_LABEL = new LocalizedTextVo('無法比較', 'Cannot compare')
const KEEPING_UP_LABEL = new LocalizedTextVo('不低於回測', 'Not below backtest')
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
          ? this.backtestFailureMessage(row.backtestFailureReason)
          : null
        const verdictLabel = gapPoints === null
          ? NO_VERDICT_LABEL
          : (lagging
              ? new LocalizedTextVo(`比回測低 ${gapPoints} 個百分點`, `${gapPoints} percentage points below backtest`)
              : KEEPING_UP_LABEL)
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
          ? new LocalizedTextVo(
              '整份策略平均進場滑點：不適用（沒有來自機器人連結的實單）',
              'Strategy-wide avg entry slippage: N/A (no live trades from bot links)')
          : new LocalizedTextVo(
              `整份策略平均進場滑點 ${this.slippageText(strategySlippage)}，以 ${this.comparison.entrySlippageTradeCount} 筆計`,
              `Strategy-wide avg entry slippage ${this.slippageText(strategySlippage)}, across ${this.comparison.entrySlippageTradeCount} ${this.comparison.entrySlippageTradeCount === 1 ? 'trade' : 'trades'}`),
      COST_NOTE,
    )
  }

  private performanceDto(performance: SpotTradePerformance): SpotTradePerformanceDto {
    return new SpotTradePerformanceDto(
      new LocalizedTextVo(
        `${performance.closedTradeCount} 筆`,
        `${performance.closedTradeCount} ${performance.closedTradeCount === 1 ? 'trade' : 'trades'}`),
      performance.winRate === null
        ? NOT_APPLICABLE_TEXT
        : new UntranslatedTextVo(`${Math.round(performance.winRate * PERCENT)}%`),
      performance.averageEntrySlippagePercentage === null
        ? NOT_APPLICABLE_TEXT
        : new UntranslatedTextVo(this.slippageText(performance.averageEntrySlippagePercentage)),
      performance.entrySlippageTradeCount > 0
        ? new LocalizedTextVo(
            `以 ${performance.entrySlippageTradeCount} 筆計`, `across ${performance.entrySlippageTradeCount} ${performance.entrySlippageTradeCount === 1 ? 'trade' : 'trades'}`)
        : null,
    )
  }

  /** 後端給的失敗原因是它自己的原文，照抄、不翻；只有它缺席時的那一句是這一側說的。 */
  private backtestFailureMessage(backtestFailureReason: string | null): LocalizedTextVo {
    return backtestFailureReason === null
      ? new LocalizedTextVo('重演沒有結果，無法重演', 'The replay returned no result, so nothing can be compared')
      : new LocalizedTextVo(`${backtestFailureReason}，無法重演`, `${backtestFailureReason}, so nothing can be compared`)
  }

  private slippageText(percentage: Decimal): string {
    return new JournalNumberDomain(percentage).percentage(SLIPPAGE_FRACTION_DIGITS)
  }
}
