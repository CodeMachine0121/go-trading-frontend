import type { ContractTradeRecord } from '~/domain/models/entities/contract-trade-record'
import { ContractTradeRecordDto } from '~/domain/models/dto/contract-trade-record-dto'
import { ContractTradeFillDto } from '~/domain/models/dto/contract-trade-fill-dto'
import { TradeNoteDto } from '~/domain/models/dto/trade-note-dto'
import { TradeSourceDto } from '~/domain/models/dto/trade-source-dto'
import { TradeReviewDto } from '~/domain/models/dto/trade-review-dto'
import { ContractTradeDirectionDomain } from '~/domain/models/domains/contract-trade-direction-domain'
import { ContractTradeStatusDomain } from '~/domain/models/domains/contract-trade-status-domain'
import { ContractTradeOutcomeDomain } from '~/domain/models/domains/contract-trade-outcome-domain'
import { TradeLinkedStrategyDomain } from '~/domain/models/domains/trade-linked-strategy-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'
import { TradeHoldingDurationDomain } from '~/domain/models/domains/trade-holding-duration-domain'
import { ContractSymbolDomain } from '~/domain/models/domains/contract-symbol-domain'
import Decimal from 'decimal.js'

const REVIEW_AFTER_CLOSE_MESSAGE = '平倉後才能檢討'
const NOT_SET_TEXT = '未設定'
const IMPLAUSIBLE_FEE_NOTE = '手續費與數量對不上'

export class ContractTradeRecordDomain {
  constructor(private readonly record: ContractTradeRecord) {}

  toDto(): ContractTradeRecordDto {
    const direction = new ContractTradeDirectionDomain(this.record.direction, this.record.leverage)
    const status = new ContractTradeStatusDomain(this.record.status)
    const source = this.record.source
    const linkedStrategyLabel = new TradeLinkedStrategyDomain(
      this.record.tradingStrategyId,
      this.record.tradingStrategyName,
      this.record.tradingStrategyDeleted).label
    const sourceLabel = source === null ? null : `來自 ${source.strategyBotName}・第 ${source.runNumber} 輪`
    const chronologicalFills = [...this.record.fills]
      .sort((earlier, later) => earlier.filledAt.getTime() - later.filledAt.getTime())
    const positionActionLabels = chronologicalFills.reduce<{ position: Decimal, labels: string[] }>((state, fill) => {
      const position = fill.kind === 'entry' ? state.position.plus(fill.quantity) : state.position.minus(fill.quantity)
      const entryLabel = state.position.isZero() ? '開倉' : '加倉'
      const exitLabel = position.lessThanOrEqualTo(0) ? '平倉' : '減倉'

      return { position, labels: [...state.labels, fill.kind === 'entry' ? entryLabel : exitLabel] }
    }, { position: new Decimal(0), labels: [] }).labels
    const baseAsset = new ContractSymbolDomain(this.record.symbol).baseAsset
    const implausibleFeePositions = chronologicalFills.flatMap((fill, index) =>
      this.record.outcome.implausibleFeeFillIds.includes(fill.id) ? [index + 1] : [])

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
      linkedStrategyLabel,
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
      chronologicalFills.map((fill, index) => new ContractTradeFillDto(
        fill.id,
        fill.kind,
        positionActionLabels[index] ?? '',
        fill.filledAt,
        fill.price,
        new JournalNumberDomain(fill.price).price(),
        fill.quantity,
        new JournalNumberDomain(fill.quantity).quantity(),
        fill.liquidity,
        fill.liquidity === 'maker' ? '掛單' : '吃單',
        fill.fee,
        new JournalNumberDomain(fill.fee).amount(),
        fill.feeRateMissing ? '未設定費率' : this.record.outcome.implausibleFeeFillIds.includes(fill.id) ? IMPLAUSIBLE_FEE_NOTE : null,
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
      new ContractTradeOutcomeDomain(this.record.outcome, status.isOpen, source !== null).toDto(),
      this.record.outcome.maximumAdversePrice,
      this.record.outcome.maximumFavorablePrice,
      this.record.closedAt === null
        ? null
        : new TradeHoldingDurationDomain(this.record.openedAt, this.record.closedAt).text,
      sourceLabel ?? linkedStrategyLabel,
      baseAsset ?? '',
      implausibleFeePositions.length === 0
        ? null
        : `第 ${implausibleFeePositions.join('、')} 筆的${IMPLAUSIBLE_FEE_NOTE}，數量可能記錯了${baseAsset === null ? '' : `（數量的單位是 ${baseAsset}）`}`,
    )
  }

  private priceText(price: Decimal | null): string {
    return price === null ? NOT_SET_TEXT : new JournalNumberDomain(price).price()
  }
}
