import Decimal from 'decimal.js'
import type { ContractTradeDraftDto } from '~/domain/models/dto/contract-trade-draft-dto'
import type { ContractTradeDraftFillDto } from '~/domain/models/dto/contract-trade-draft-fill-dto'
import type { ContractTradeFillDto } from '~/domain/models/dto/contract-trade-fill-dto'
import type { TradeJournalSettingDto } from '~/domain/models/dto/trade-journal-setting-dto'
import { ContractTradeDraftPreviewDto } from '~/domain/models/dto/contract-trade-draft-preview-dto'
import { ContractTradeDraftFeePreviewDto } from '~/domain/models/dto/contract-trade-draft-fee-preview-dto'
import { ContractTradeFillWriteDto } from '~/domain/models/dto/contract-trade-fill-write-dto'
import { ContractTradeRecordWriteDto } from '~/domain/models/dto/contract-trade-record-write-dto'
import { ContractTradeRecordSubmissionDto } from '~/domain/models/dto/contract-trade-record-submission-dto'
import { ContractTradePricedQuantityVo } from '~/domain/models/vo/contract-trade-priced-quantity-vo'
import { ContractTradeRejectedError } from '~/domain/errors/contract-trade-rejected-error'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'

const PERCENT = 100
const DISTANCE_FRACTION_DIGITS = 2
const FEE_RATE_MISSING_NOTE = '尚未設定手續費率'
const MISSING_SYMBOL_MESSAGE = '請填合約標的'
const MISSING_ENTRY_MESSAGE = '至少要有一筆填好成交價與數量的進場成交'
const MISSING_FILL_MESSAGE = '至少要有一筆填好成交價與數量的成交'

export class ContractTradeDraftDomain {
  constructor(
    private readonly draft: ContractTradeDraftDto,
    private readonly setting: TradeJournalSettingDto,
    private readonly existingFills: readonly ContractTradeFillDto[] | null = null,
  ) {}

  toPreviewDto(): ContractTradeDraftPreviewDto {
    const pricedQuantities = [
      ...(this.existingFills ?? []).map(fill => new ContractTradePricedQuantityVo(fill.kind, fill.price, fill.quantity)),
      ...this.draft.fills.flatMap((fill) => {
        const price = this.decimalOf(fill.priceText)
        const quantity = this.decimalOf(fill.quantityText)

        return price === null || quantity === null ? [] : [new ContractTradePricedQuantityVo(fill.kind, price, quantity)]
      }),
    ]
    const entries = pricedQuantities.filter(pricedQuantity => pricedQuantity.kind === 'entry')
    const enteredQuantity = entries.reduce((total, entry) => total.plus(entry.quantity), new Decimal(0))
    const exitedQuantity = pricedQuantities
      .filter(pricedQuantity => pricedQuantity.kind === 'exit')
      .reduce((total, exit) => total.plus(exit.quantity), new Decimal(0))
    const averageEntryPrice = enteredQuantity.isZero()
      ? null
      : entries.reduce((total, entry) => total.plus(entry.price.times(entry.quantity)), new Decimal(0))
          .dividedBy(enteredQuantity)
    const displayedFractionDigits = Math.max(0, ...entries.map(entry => entry.price.decimalPlaces())) + 1
    const plannedStopLoss = this.decimalOf(this.draft.plannedStopLossText)
    const stopDistance = averageEntryPrice === null || plannedStopLoss === null
      ? null
      : averageEntryPrice.minus(plannedStopLoss)

    return new ContractTradeDraftPreviewDto(
      new JournalNumberDomain(enteredQuantity.minus(exitedQuantity)).quantity(),
      averageEntryPrice === null
        ? null
        : new JournalNumberDomain(averageEntryPrice).priceAt(displayedFractionDigits),
      stopDistance === null || averageEntryPrice === null
        ? null
        : `${stopDistance.isNegative() ? '往上' : '往下'} ${new JournalNumberDomain(
          stopDistance.abs().dividedBy(averageEntryPrice).times(PERCENT)).percentage(DISTANCE_FRACTION_DIGITS)}`,
      stopDistance === null
        ? null
        : new JournalNumberDomain(stopDistance.abs().times(enteredQuantity)).amount(),
      this.draft.fills.map((fill) => {
        const rate = fill.liquidity === 'maker' ? this.setting.makerFeeRate : this.setting.takerFeeRate
        const price = this.decimalOf(fill.priceText) ?? new Decimal(0)
        const quantity = this.decimalOf(fill.quantityText) ?? new Decimal(0)

        return rate === null
          ? new ContractTradeDraftFeePreviewDto(new JournalNumberDomain(new Decimal(0)).amount(), FEE_RATE_MISSING_NOTE)
          : new ContractTradeDraftFeePreviewDto(
              new JournalNumberDomain(price.times(quantity).times(rate).dividedBy(PERCENT)).amount(), null)
      }),
      this.setting.makerFeeRate === null || this.setting.takerFeeRate === null,
      this.missingFieldMessage(),
    )
  }

  toRecordSubmission(): ContractTradeRecordSubmissionDto {
    const fillWriteDtos = this.toFillWriteDtos()
    const firstEntryIndex = fillWriteDtos.findIndex(fill => fill.kind === 'entry')
    const firstEntryFill = fillWriteDtos[firstEntryIndex]
    if (firstEntryFill === undefined) {
      throw new ContractTradeRejectedError(MISSING_ENTRY_MESSAGE, null)
    }

    return new ContractTradeRecordSubmissionDto(
      new ContractTradeRecordWriteDto(
        this.draft.symbol.trim().toUpperCase(),
        this.draft.direction,
        this.decimalOf(this.draft.leverageText),
        firstEntryFill,
        this.decimalOf(this.draft.plannedStopLossText),
        this.decimalOf(this.draft.plannedTakeProfitText),
        this.draft.entryReason.trim(),
        this.draft.confidence,
        this.draft.tradingStrategyId,
        this.draft.setupTagIds,
        this.draft.journalLinkIdentifier,
      ),
      fillWriteDtos.filter((_, index) => index !== firstEntryIndex),
    )
  }

  toFillWriteDtos(): [ContractTradeFillWriteDto, ...ContractTradeFillWriteDto[]] {
    const missingFieldMessage = this.missingFieldMessage()
    if (missingFieldMessage !== null) {
      throw new ContractTradeRejectedError(missingFieldMessage, null)
    }

    const [firstWriteDto, ...otherWriteDtos] = this.draft.fills
      .map(fill => this.toFillWriteDto(fill))
      .filter((writeDto): writeDto is ContractTradeFillWriteDto => writeDto !== null)
    if (firstWriteDto === undefined) {
      throw new ContractTradeRejectedError(MISSING_FILL_MESSAGE, null)
    }

    return [firstWriteDto, ...otherWriteDtos]
  }

  differsFrom(initialDraft: ContractTradeDraftDto): boolean {
    return JSON.stringify(this.draft) !== JSON.stringify(initialDraft)
  }

  private missingFieldMessage(): string | null {
    if (this.existingFills === null && this.draft.symbol.trim() === '') {
      return MISSING_SYMBOL_MESSAGE
    }

    const unreadableIndex = this.draft.fills.findIndex(fill => this.toFillWriteDto(fill) === null)
    if (unreadableIndex !== -1) {
      return `第 ${unreadableIndex + 1} 筆成交的成交價與數量要填大於零的數字`
    }

    const hasEntry = (this.existingFills ?? []).some(fill => fill.kind === 'entry')
      || this.draft.fills.some(fill => fill.kind === 'entry')

    return hasEntry ? null : MISSING_ENTRY_MESSAGE
  }

  private toFillWriteDto(fill: ContractTradeDraftFillDto): ContractTradeFillWriteDto | null {
    const price = this.decimalOf(fill.priceText)
    const quantity = this.decimalOf(fill.quantityText)
    if (price === null || quantity === null || !price.greaterThan(0) || !quantity.greaterThan(0)) {
      return null
    }

    return new ContractTradeFillWriteDto(
      fill.kind, fill.filledAt, price, quantity, fill.liquidity, this.decimalOf(fill.feeText))
  }

  private decimalOf(text: string): Decimal | null {
    const trimmed = text.trim().replaceAll(',', '')
    if (trimmed === '') {
      return null
    }

    try {
      return new Decimal(trimmed)
    }
    catch {
      return null
    }
  }
}
