import type { ContractTradeRecord } from '~/domain/models/entities/contract-trade-record'
import { ContractTradeRecordDto } from '~/domain/models/dto/contract-trade-record-dto'
import { ContractTradeFillDto } from '~/domain/models/dto/contract-trade-fill-dto'
import { ContractTradeNoteDto } from '~/domain/models/dto/contract-trade-note-dto'
import { ContractTradeSourceDto } from '~/domain/models/dto/contract-trade-source-dto'
import { ContractTradeReviewDto } from '~/domain/models/dto/contract-trade-review-dto'
import { ContractTradeDirectionDomain } from '~/domain/models/domains/contract-trade-direction-domain'
import { ContractTradeStatusDomain } from '~/domain/models/domains/contract-trade-status-domain'
import { ContractTradeOutcomeDomain } from '~/domain/models/domains/contract-trade-outcome-domain'
import { ContractTradeLinkedStrategyDomain } from '~/domain/models/domains/contract-trade-linked-strategy-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'
import type Decimal from 'decimal.js'

const REVIEW_AFTER_CLOSE_MESSAGE = '平倉後才能檢討'
const NOT_SET_TEXT = '未設定'

export class ContractTradeRecordDomain {
  constructor(private readonly record: ContractTradeRecord) {}

  toDto(): ContractTradeRecordDto {
    const direction = new ContractTradeDirectionDomain(this.record.direction, this.record.leverage)
    const status = new ContractTradeStatusDomain(this.record.status)
    const source = this.record.source

    return new ContractTradeRecordDto(
      this.record.id,
      `#${this.record.id} ${this.record.symbol} ${direction.label}`,
      this.record.symbol,
      this.record.direction,
      direction.label,
      direction.tone,
      this.record.leverage,
      this.record.status,
      status.label,
      status.tone,
      new ContractTradeLinkedStrategyDomain(
        this.record.tradingStrategyId,
        this.record.tradingStrategyName,
        this.record.tradingStrategyDeleted).label,
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
      this.record.outcome.position,
      this.record.outcome.averageEntryPrice,
      [...this.record.fills]
        .sort((earlier, later) => earlier.filledAt.getTime() - later.filledAt.getTime())
        .map(fill => new ContractTradeFillDto(
          fill.id,
          fill.kind,
          fill.kind === 'entry' ? '進場' : '出場',
          fill.filledAt,
          fill.price,
          new JournalNumberDomain(fill.price).price(),
          fill.quantity,
          new JournalNumberDomain(fill.quantity).quantity(),
          fill.liquidity,
          fill.liquidity === 'maker' ? '掛單' : '吃單',
          fill.fee,
          new JournalNumberDomain(fill.fee).amount(),
          fill.feeRateMissing ? '未設定費率' : null,
        )),
      [...this.record.notes]
        .sort((earlier, later) => earlier.createdAt.getTime() - later.createdAt.getTime())
        .map(note => new ContractTradeNoteDto(note.id, note.content, note.createdAt)),
      this.record.tags.filter(tag => tag.kind === 'setup').map(tag => tag.toDto()),
      this.record.tags.filter(tag => tag.kind === 'mistake').map(tag => tag.toDto()),
      source === null
        ? null
        : new ContractTradeSourceDto(
            `來自 ${source.strategyBotName}・第 ${source.runNumber} 輪`,
            this.priceText(source.referencePrice),
            this.priceText(source.suggestedStopLossPrice),
            this.priceText(source.suggestedTakeProfitPrice),
          ),
      this.record.review === null
        ? null
        : new ContractTradeReviewDto(
            this.record.review.wentWell,
            this.record.review.wentWrong,
            this.record.review.nextTime,
            this.record.review.executionScore,
          ),
      new ContractTradeOutcomeDomain(this.record.outcome, status.isOpen, source !== null).toDto(),
      this.record.outcome.maximumAdversePrice,
      this.record.outcome.maximumFavorablePrice,
    )
  }

  private priceText(price: Decimal | null): string {
    return price === null ? NOT_SET_TEXT : new JournalNumberDomain(price).price()
  }
}
