import type Decimal from 'decimal.js'
import type { SpotTradeRecord } from '~/domain/models/entities/spot-trade-record'
import { SpotTradeRecordDto } from '~/domain/models/dto/spot-trade-record-dto'
import { SpotTradeFillDto } from '~/domain/models/dto/spot-trade-fill-dto'
import { TradeNoteDto } from '~/domain/models/dto/trade-note-dto'
import { TradeSourceDto } from '~/domain/models/dto/trade-source-dto'
import { TradeReviewDto } from '~/domain/models/dto/trade-review-dto'
import { SpotTradeStatusDomain } from '~/domain/models/domains/spot-trade-status-domain'
import { SpotTradeMarketDomain } from '~/domain/models/domains/spot-trade-market-domain'
import { SpotTradeOutcomeDomain } from '~/domain/models/domains/spot-trade-outcome-domain'
import { TradeLinkedStrategyDomain } from '~/domain/models/domains/trade-linked-strategy-domain'
import { TradeHoldingDurationDomain } from '~/domain/models/domains/trade-holding-duration-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'

const REVIEW_AFTER_CLOSE_MESSAGE = '平倉後才能檢討'
const NOT_SET_TEXT = '未設定'
const HOLDING_WORD = '持有'

export class SpotTradeRecordDomain {
  constructor(private readonly record: SpotTradeRecord) {}

  toDto(): SpotTradeRecordDto {
    const status = new SpotTradeStatusDomain(this.record.status)
    const market = new SpotTradeMarketDomain(this.record.market)
    const source = this.record.source
    const linkedStrategyLabel = new TradeLinkedStrategyDomain(
      this.record.tradingStrategyId,
      this.record.tradingStrategyName,
      this.record.tradingStrategyDeleted).label
    const sourceLabel = source === null ? null : `來自 ${source.strategyBotName}・第 ${source.runNumber} 輪`

    return new SpotTradeRecordDto(
      this.record.id,
      `#${this.record.id} ${this.record.symbol}`,
      this.record.symbol,
      this.record.market,
      market.label,
      this.record.currency,
      market.wholeSharesOnly,
      this.record.status,
      status.label,
      status.tone,
      !status.isOpen,
      status.isOpen,
      !status.isOpen,
      status.isOpen ? REVIEW_AFTER_CLOSE_MESSAGE : null,
      this.record.plannedStopLossPrice,
      this.record.plannedTakeProfitPrice,
      this.priceText(this.record.plannedStopLossPrice),
      this.priceText(this.record.plannedTakeProfitPrice),
      this.record.entryReason,
      this.record.confidence,
      this.record.tradingStrategyId,
      this.record.openedAt,
      this.record.closedAt,
      this.record.outcome.holding,
      `${new JournalNumberDomain(this.record.outcome.holding).quantity()}${market.wholeSharesOnly ? ' 股' : ''}`,
      this.record.outcome.averageBuyPrice,
      [...this.record.fills]
        .sort((earlier, later) => earlier.filledAt.getTime() - later.filledAt.getTime())
        .map(fill => new SpotTradeFillDto(
          fill.id,
          fill.kind,
          fill.kind === 'buy' ? '買進' : '賣出',
          fill.filledAt,
          fill.price,
          new JournalNumberDomain(fill.price).price(),
          fill.quantity,
          new JournalNumberDomain(fill.quantity).quantity(),
          fill.fee,
          new JournalNumberDomain(fill.fee).amount(),
        )),
      [...this.record.notes]
        .sort((earlier, later) => earlier.createdAt.getTime() - later.createdAt.getTime())
        .map(note => new TradeNoteDto(note.id, note.content, note.createdAt)),
      this.record.tags.filter(tag => tag.kind === 'setup').map(tag => tag.toDto()),
      this.record.tags.filter(tag => tag.kind === 'mistake').map(tag => tag.toDto()),
      source === null
        ? null
        : new TradeSourceDto(
            sourceLabel ?? '',
            this.priceText(source.referencePrice),
            this.priceText(source.suggestedStopLossPrice),
            this.priceText(source.suggestedTakeProfitPrice),
          ),
      this.record.review === null
        ? null
        : new TradeReviewDto(
            this.record.review.wentWell,
            this.record.review.wentWrong,
            this.record.review.nextTime,
            this.record.review.executionScore,
          ),
      new SpotTradeOutcomeDomain(this.record.outcome, status.isOpen, source !== null).toDto(),
      this.record.outcome.maximumAdversePrice,
      this.record.outcome.maximumFavorablePrice,
      this.record.closedAt === null
        ? null
        : new TradeHoldingDurationDomain(this.record.openedAt, this.record.closedAt, HOLDING_WORD).text,
      sourceLabel ?? linkedStrategyLabel,
    )
  }

  private priceText(price: Decimal | null): string {
    return price === null ? NOT_SET_TEXT : new JournalNumberDomain(price).price()
  }
}
