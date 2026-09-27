import Decimal from 'decimal.js'
import type { ContractTradeDraftDto } from '~/domain/models/dto/contract-trade-draft-dto'
import type { ContractTradeDraftFillDto } from '~/domain/models/dto/contract-trade-draft-fill-dto'
import type { ContractTradeFillDto } from '~/domain/models/dto/contract-trade-fill-dto'
import type { ContractTradePrefillDto } from '~/domain/models/dto/contract-trade-prefill-dto'
import type { TradeFormField } from '~/domain/models/vo/trade-form-field-vo'
import type { TradeJournalSettingDto } from '~/domain/models/dto/trade-journal-setting-dto'
import { ContractTradeDraftPreviewDto } from '~/domain/models/dto/contract-trade-draft-preview-dto'
import { ContractTradeDraftFeePreviewDto } from '~/domain/models/dto/contract-trade-draft-fee-preview-dto'
import { ContractTradeFillWriteDto } from '~/domain/models/dto/contract-trade-fill-write-dto'
import { ContractTradeRecordWriteDto } from '~/domain/models/dto/contract-trade-record-write-dto'
import { ContractTradeRecordSubmissionDto } from '~/domain/models/dto/contract-trade-record-submission-dto'
import { ContractTradePricedQuantityVo } from '~/domain/models/vo/contract-trade-priced-quantity-vo'
import { TradeRejectedError } from '~/domain/errors/trade-rejected-error'
import { DecimalInputDomain } from '~/domain/models/domains/decimal-input-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'
import { ContractTradeEntrySlippageDomain } from '~/domain/models/domains/contract-trade-entry-slippage-domain'

const PERCENT = 100
const DISTANCE_FRACTION_DIGITS = 2
const FEE_RATE_MISSING_NOTE = '尚未設定手續費率'
const MISSING_SYMBOL_MESSAGE = '請填合約標的'
const MISSING_ENTRY_MESSAGE = '至少要有一筆填好開倉價與數量的開倉'
const MISSING_FILL_MESSAGE = '至少要有一筆填好價格與數量的開倉或平倉'

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
        const price = new DecimalInputDomain(fill.priceText).value
        const quantity = new DecimalInputDomain(fill.quantityText).value

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
    const plannedStopLoss = new DecimalInputDomain(this.draft.plannedStopLossText).value
    const stopDistance = averageEntryPrice === null || plannedStopLoss === null
      ? null
      : averageEntryPrice.minus(plannedStopLoss)
    const plannedTakeProfit = new DecimalInputDomain(this.draft.plannedTakeProfitText).value
    const referencePrice = this.draft.referencePrice
    const entrySlippageText = this.existingFills !== null || averageEntryPrice === null || referencePrice === null || referencePrice.isZero()
      ? null
      : new ContractTradeEntrySlippageDomain(this.draft.direction, averageEntryPrice, referencePrice).text
    const distanceText = (level: Decimal | null) => averageEntryPrice === null || level === null
      ? null
      : `${level.greaterThanOrEqualTo(averageEntryPrice) ? '往上' : '往下'} ${new JournalNumberDomain(
        level.minus(averageEntryPrice).abs().dividedBy(averageEntryPrice).times(PERCENT)).percentage(DISTANCE_FRACTION_DIGITS)}`

    return new ContractTradeDraftPreviewDto(
      new JournalNumberDomain(enteredQuantity.minus(exitedQuantity)).quantity(),
      averageEntryPrice === null
        ? null
        : new JournalNumberDomain(averageEntryPrice).priceAt(displayedFractionDigits),
      distanceText(plannedStopLoss),
      stopDistance === null
        ? null
        : new JournalNumberDomain(stopDistance.abs().times(enteredQuantity)).amount(),
      distanceText(plannedTakeProfit),
      entrySlippageText,
      this.draft.fills.map((fill) => {
        const rate = fill.liquidity === 'maker' ? this.setting.makerFeeRate : this.setting.takerFeeRate
        const price = new DecimalInputDomain(fill.priceText).value ?? new Decimal(0)
        const quantity = new DecimalInputDomain(fill.quantityText).value ?? new Decimal(0)

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
      throw new TradeRejectedError(MISSING_ENTRY_MESSAGE, null)
    }

    return new ContractTradeRecordSubmissionDto(
      new ContractTradeRecordWriteDto(
        this.draft.symbol.trim().toUpperCase(),
        this.draft.direction,
        new DecimalInputDomain(this.draft.leverageText).value,
        firstEntryFill,
        new DecimalInputDomain(this.draft.plannedStopLossText).value,
        new DecimalInputDomain(this.draft.plannedTakeProfitText).value,
        this.draft.entryReason.trim(),
        this.draft.confidence,
        this.draft.tradingStrategyId,
        this.draft.setupTagIds,
        this.draft.journalLinkIdentifier,
      ),
      fillWriteDtos.filter((_, index) => index !== firstEntryIndex),
    )
  }

  submittedFillPositions(forNewTrade: boolean): number[] {
    const pricedPositions = this.draft.fills.flatMap((fill, position) => this.toFillWriteDto(fill) === null ? [] : [position])
    const firstOpeningPosition = pricedPositions.find(position => this.draft.fills[position]?.kind === 'entry')
    if (!forNewTrade || firstOpeningPosition === undefined) {
      return pricedPositions
    }

    return [firstOpeningPosition, ...pricedPositions.filter(position => position !== firstOpeningPosition)]
  }

  toFillWriteDtos(): [ContractTradeFillWriteDto, ...ContractTradeFillWriteDto[]] {
    const missingFieldMessage = this.missingFieldMessage()
    if (missingFieldMessage !== null) {
      throw new TradeRejectedError(missingFieldMessage, null)
    }

    const [firstWriteDto, ...otherWriteDtos] = this.draft.fills
      .map(fill => this.toFillWriteDto(fill))
      .filter((writeDto): writeDto is ContractTradeFillWriteDto => writeDto !== null)
    if (firstWriteDto === undefined) {
      throw new TradeRejectedError(MISSING_FILL_MESSAGE, null)
    }

    return [firstWriteDto, ...otherWriteDtos]
  }

  prefilledFields(prefill: ContractTradePrefillDto): TradeFormField[] {
    const firstFill = this.draft.fills[0]
    const stillMatching = (text: string, prefilledValue: Decimal | null) =>
      prefilledValue !== null && text.trim() !== '' && text.trim() === prefilledValue.toString()
    const candidates: [TradeFormField, boolean][] = [
      ['symbol', this.draft.symbol === prefill.symbol],
      ['direction', this.draft.direction === prefill.direction],
      ['leverage', stillMatching(this.draft.leverageText, prefill.leverage)],
      ['plannedStopLossPrice', stillMatching(this.draft.plannedStopLossText, prefill.plannedStopLossPrice)],
      ['plannedTakeProfitPrice', stillMatching(this.draft.plannedTakeProfitText, prefill.plannedTakeProfitPrice)],
      ['tradingStrategy', prefill.tradingStrategyId !== null && this.draft.tradingStrategyId === prefill.tradingStrategyId],
      ['fillPrice', stillMatching(firstFill?.priceText ?? '', prefill.entryPrice)],
      ['fillQuantity', stillMatching(firstFill?.quantityText ?? '', prefill.quantity)],
    ]

    return candidates.filter(([, prefilled]) => prefilled).map(([field]) => field)
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
      return `第 ${unreadableIndex + 1} 筆的價格與數量要填大於零的數字`
    }

    const hasEntry = (this.existingFills ?? []).some(fill => fill.kind === 'entry')
      || this.draft.fills.some(fill => fill.kind === 'entry')

    return hasEntry ? null : MISSING_ENTRY_MESSAGE
  }

  private toFillWriteDto(fill: ContractTradeDraftFillDto): ContractTradeFillWriteDto | null {
    const price = new DecimalInputDomain(fill.priceText).value
    const quantity = new DecimalInputDomain(fill.quantityText).value
    if (price === null || quantity === null || !price.greaterThan(0) || !quantity.greaterThan(0)) {
      return null
    }

    return new ContractTradeFillWriteDto(
      fill.kind, fill.filledAt, price, quantity, fill.liquidity, new DecimalInputDomain(fill.feeText).value)
  }
}
