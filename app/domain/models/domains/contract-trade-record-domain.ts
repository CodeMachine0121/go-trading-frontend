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
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'
import Decimal from 'decimal.js'

const REVIEW_AFTER_CLOSE_MESSAGE = new LocalizedTextVo('平倉後才能檢討', 'You can review after the trade is closed')
const NOT_SET_TEXT = new LocalizedTextVo('未設定', 'Not set')
const IMPLAUSIBLE_FEE_NOTE = new LocalizedTextVo('手續費與數量對不上', 'Fee does not match the quantity')
const FEE_RATE_MISSING_NOTE = new LocalizedTextVo('未設定費率', 'Fee rate not set')
const MAKER_LABEL = new LocalizedTextVo('掛單', 'Maker')
const TAKER_LABEL = new LocalizedTextVo('吃單', 'Taker')
const OPENING_LABEL = new LocalizedTextVo('開倉', 'Entry')
const ADDING_LABEL = new LocalizedTextVo('加倉', 'Add')
const CLOSING_LABEL = new LocalizedTextVo('平倉', 'Exit')
const REDUCING_LABEL = new LocalizedTextVo('減倉', 'Reduce')

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
    const chronologicalFills = [...this.record.fills]
      .sort((earlier, later) => earlier.filledAt.getTime() - later.filledAt.getTime())
    const positionActionLabels = chronologicalFills.reduce<{ position: Decimal, labels: LocalizedTextVo[] }>((state, fill) => {
      const position = fill.kind === 'entry' ? state.position.plus(fill.quantity) : state.position.minus(fill.quantity)
      const entryLabel = state.position.isZero() ? OPENING_LABEL : ADDING_LABEL
      const exitLabel = position.lessThanOrEqualTo(0) ? CLOSING_LABEL : REDUCING_LABEL

      return { position, labels: [...state.labels, fill.kind === 'entry' ? entryLabel : exitLabel] }
    }, { position: new Decimal(0), labels: [] }).labels
    const baseAsset = new ContractSymbolDomain(this.record.symbol).baseAsset
    const implausibleFeePositions = chronologicalFills.flatMap((fill, index) =>
      this.record.outcome.implausibleFeeFillIds.includes(fill.id) ? [index + 1] : [])

    return new ContractTradeRecordDto(
      this.record.id,
      new LocalizedTextVo(
        `#${this.record.id} ${this.record.symbol} ${direction.label.traditionalChinese}`,
        `#${this.record.id} ${this.record.symbol} ${direction.label.english}`),
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
        positionActionLabels[index] ?? OPENING_LABEL,
        fill.filledAt,
        fill.price,
        new JournalNumberDomain(fill.price).price(),
        fill.quantity,
        new JournalNumberDomain(fill.quantity).quantity(),
        fill.liquidity,
        fill.liquidity === 'maker' ? MAKER_LABEL : TAKER_LABEL,
        fill.fee,
        new JournalNumberDomain(fill.fee).amount(),
        fill.feeRateMissing
          ? FEE_RATE_MISSING_NOTE
          : this.record.outcome.implausibleFeeFillIds.includes(fill.id) ? IMPLAUSIBLE_FEE_NOTE : null,
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
      new ContractTradeOutcomeDomain(this.record.outcome, status.isOpen, source !== null).toDto(),
      this.record.outcome.maximumAdversePrice,
      this.record.outcome.maximumFavorablePrice,
      this.record.closedAt === null
        ? null
        : new TradeHoldingDurationDomain(this.record.openedAt, this.record.closedAt).text,
      sourceDto?.label ?? linkedStrategyLabel,
      baseAsset ?? '',
      implausibleFeePositions.length === 0
        ? null
        : new LocalizedTextVo(
            `第 ${implausibleFeePositions.join('、')} 筆的${IMPLAUSIBLE_FEE_NOTE.traditionalChinese}，數量可能記錯了${baseAsset === null ? '' : `（數量的單位是 ${baseAsset}）`}`,
            `The fee on fill ${implausibleFeePositions.join(', ')} does not match the quantity; the quantity may be wrong${baseAsset === null ? '' : ` (quantity is in ${baseAsset})`}`),
    )
  }

  private priceText(price: Decimal | null): LocalizedTextVo {
    return price === null ? NOT_SET_TEXT : new UntranslatedTextVo(new JournalNumberDomain(price).price())
  }
}
