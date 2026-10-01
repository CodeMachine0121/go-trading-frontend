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
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

const REVIEW_AFTER_CLOSE_MESSAGE = new LocalizedTextVo('平倉後才能檢討', 'You can review after the trade is closed')
const NOT_SET_TEXT = new LocalizedTextVo('未設定', 'Not set')
const BUY_LABEL = new LocalizedTextVo('買進', 'Buy')
const SELL_LABEL = new LocalizedTextVo('賣出', 'Sell')
const HOLDING_WORD = new LocalizedTextVo('持有', 'Held')

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
    const sourceDto = source === null
      ? null
      : new TradeSourceDto(
          new LocalizedTextVo(
            `來自 ${source.strategyBotName}・第 ${source.runNumber} 輪`,
            `From ${source.strategyBotName} · run ${source.runNumber}`),
          this.priceText(source.referencePrice),
          this.priceText(source.suggestedStopLossPrice),
          this.priceText(source.suggestedTakeProfitPrice),
        )

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
      this.holdingText(market.wholeSharesOnly),
      this.record.outcome.averageBuyPrice,
      [...this.record.fills]
        .sort((earlier, later) => earlier.filledAt.getTime() - later.filledAt.getTime())
        .map(fill => new SpotTradeFillDto(
          fill.id,
          fill.kind,
          fill.kind === 'buy' ? BUY_LABEL : SELL_LABEL,
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
      sourceDto,
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
      sourceDto?.label ?? linkedStrategyLabel,
    )
  }

  private priceText(price: Decimal | null): LocalizedTextVo {
    return price === null ? NOT_SET_TEXT : new UntranslatedTextVo(new JournalNumberDomain(price).price())
  }

  private holdingText(wholeSharesOnly: boolean): LocalizedTextVo {
    const quantity = new JournalNumberDomain(this.record.outcome.holding).quantity()

    return wholeSharesOnly
      ? new LocalizedTextVo(`${quantity} 股`, `${quantity} shares`)
      : new UntranslatedTextVo(quantity)
  }
}
