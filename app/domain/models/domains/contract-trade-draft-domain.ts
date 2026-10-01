import Decimal from 'decimal.js'
import type { ContractTradeDraftDto } from '~/domain/models/dto/contract-trade-draft-dto'
import type { ContractTradeDraftFillDto } from '~/domain/models/dto/contract-trade-draft-fill-dto'
import type { ContractTradeFillDto } from '~/domain/models/dto/contract-trade-fill-dto'
import type { ContractTradePrefillDto } from '~/domain/models/dto/contract-trade-prefill-dto'
import type { TradeFormField } from '~/domain/models/vo/trade-form-field-vo'
import type { TradeJournalSettingDto } from '~/domain/models/dto/trade-journal-setting-dto'
import { ContractTradeDraftPreviewDto } from '~/domain/models/dto/contract-trade-draft-preview-dto'
import { ContractTradeDraftFeePreviewDto } from '~/domain/models/dto/contract-trade-draft-fee-preview-dto'
import { ContractTradeDraftFillSizePreviewDto } from '~/domain/models/dto/contract-trade-draft-fill-size-preview-dto'
import { ContractTradeFillWriteDto } from '~/domain/models/dto/contract-trade-fill-write-dto'
import { ContractTradeRecordWriteDto } from '~/domain/models/dto/contract-trade-record-write-dto'
import { ContractTradeRecordSubmissionDto } from '~/domain/models/dto/contract-trade-record-submission-dto'
import { ContractTradePricedQuantityVo } from '~/domain/models/vo/contract-trade-priced-quantity-vo'
import { TradeRejectedError } from '~/domain/errors/trade-rejected-error'
import { DecimalInputDomain } from '~/domain/models/domains/decimal-input-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'
import { ContractTradeEntrySlippageDomain } from '~/domain/models/domains/contract-trade-entry-slippage-domain'
import { ContractSymbolDomain } from '~/domain/models/domains/contract-symbol-domain'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const PERCENT = 100
const DISTANCE_FRACTION_DIGITS = 2
const CONVERTED_QUANTITY_DECIMAL_PLACES = 8
const FEE_SHARE_SIGNIFICANT_DIGITS = 2
const FEE_RATE_MISSING_NOTE = new LocalizedTextVo('尚未設定手續費率', 'Fee rates not set yet')
const MISSING_SYMBOL_MESSAGE = new LocalizedTextVo('請填合約標的', 'Enter the Contract symbol')
const MISSING_ENTRY_MESSAGE = new LocalizedTextVo(
  '至少要有一筆填好開倉價與數量的開倉', 'Add at least one entry with its entry price and quantity filled in')
const MISSING_FILL_MESSAGE = new LocalizedTextVo(
  '至少要有一筆填好價格與數量的開倉或平倉', 'Add at least one entry or exit with its price and quantity filled in')
const UNREADABLE_LEVERAGE_MESSAGE = new LocalizedTextVo(
  '槓桿倍數要填大於零的數字，才能用保證金換算數量',
  'Leverage must be a number greater than zero to convert margin into quantity')

export class ContractTradeDraftDomain {
  constructor(
    private readonly draft: ContractTradeDraftDto,
    private readonly setting: TradeJournalSettingDto,
    private readonly existingFills: readonly ContractTradeFillDto[] | null = null,
  ) {}

  toPreviewDto(): ContractTradeDraftPreviewDto {
    const draftPrices = this.draft.fills.map(fill => new DecimalInputDomain(fill.priceText).value)
    const draftQuantities = this.draft.fills.map(fill => this.resolvedQuantity(fill))
    const pricedQuantities = [
      ...(this.existingFills ?? []).map(fill => new ContractTradePricedQuantityVo(fill.kind, fill.price, fill.quantity)),
      ...this.draft.fills.flatMap((fill, index) => {
        const price = draftPrices[index] ?? null
        const quantity = draftQuantities[index] ?? null

        return price === null || quantity === null ? [] : [new ContractTradePricedQuantityVo(fill.kind, price, quantity)]
      }),
    ]
    const entries = pricedQuantities.filter(pricedQuantity => pricedQuantity.kind === 'entry')
    const enteredQuantity = entries.reduce((total, entry) => total.plus(entry.quantity), new Decimal(0))
    const exitedQuantity = pricedQuantities
      .filter(pricedQuantity => pricedQuantity.kind === 'exit')
      .reduce((total, exit) => total.plus(exit.quantity), new Decimal(0))
    const entryNotional = entries.reduce((total, entry) => total.plus(entry.price.times(entry.quantity)), new Decimal(0))
    const averageEntryPrice = enteredQuantity.isZero() ? null : entryNotional.dividedBy(enteredQuantity)
    const leverage = this.leverage
    const contractSymbol = new ContractSymbolDomain(this.draft.symbol)
    const baseAsset = contractSymbol.baseAsset
    const marginText = (notional: Decimal) => leverage === null
      ? null
      : new JournalNumberDomain(notional.dividedBy(leverage)).amount()
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
    const distanceText = (level: Decimal | null) => {
      if (averageEntryPrice === null || level === null) {
        return null
      }

      const above = level.greaterThanOrEqualTo(averageEntryPrice)
      const percentage = new JournalNumberDomain(
        level.minus(averageEntryPrice).abs().dividedBy(averageEntryPrice).times(PERCENT)).percentage(DISTANCE_FRACTION_DIGITS)

      return new LocalizedTextVo(`${above ? '往上' : '往下'} ${percentage}`, `${percentage} ${above ? 'above' : 'below'}`)
    }

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
      this.draft.fills.map((fill, index) => {
        const rate = fill.liquidity === 'maker' ? this.setting.makerFeeRate : this.setting.takerFeeRate
        const price = draftPrices[index] ?? new Decimal(0)
        const quantity = draftQuantities[index] ?? new Decimal(0)

        return rate === null
          ? new ContractTradeDraftFeePreviewDto(new JournalNumberDomain(new Decimal(0)).amount(), FEE_RATE_MISSING_NOTE)
          : new ContractTradeDraftFeePreviewDto(
              new JournalNumberDomain(price.times(quantity).times(rate).dividedBy(PERCENT)).amount(), null)
      }),
      this.setting.makerFeeRate === null || this.setting.takerFeeRate === null,
      this.missingFieldMessage(),
      this.draft.fills.map((fill, index) => {
        const price = draftPrices[index] ?? null
        const quantity = draftQuantities[index] ?? null
        if (price === null || quantity === null || !price.greaterThan(0) || !quantity.greaterThan(0)) {
          return new ContractTradeDraftFillSizePreviewDto(null, null)
        }

        const notional = price.times(quantity)
        const convertedQuantityText = fill.sizeMode === 'quantity'
          ? ''
          : `≈ ${new JournalNumberDomain(quantity).quantity()}${baseAsset === null ? '' : ` ${baseAsset}`}`
        const fee = new DecimalInputDomain(fill.feeText).value
        const fillMarginText = marginText(notional)
        const notionalText = new JournalNumberDomain(notional).amount()
        const feeShareText = fee === null || !fee.greaterThan(0)
          ? null
          : `${fee.dividedBy(notional).times(PERCENT).toSignificantDigits(FEE_SHARE_SIGNIFICANT_DIGITS).toFixed()}%`

        return new ContractTradeDraftFillSizePreviewDto(
          new LocalizedTextVo(
            `${convertedQuantityText === '' ? '' : `${convertedQuantityText}・`}名目 ${notionalText}${fillMarginText === null ? '' : `・保證金 ${fillMarginText}`}`,
            `${convertedQuantityText === '' ? '' : `${convertedQuantityText} · `}Notional ${notionalText}${fillMarginText === null ? '' : ` · Margin ${fillMarginText}`}`),
          feeShareText === null
            ? null
            : new LocalizedTextVo(`手續費約佔名目 ${feeShareText}`, `Fee is about ${feeShareText} of notional`),
        )
      }),
      enteredQuantity.isZero() ? null : new JournalNumberDomain(entryNotional).amount(),
      enteredQuantity.isZero() ? null : marginText(entryNotional),
      contractSymbol.quantityLabel,
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
      ['fillQuantity', firstFill?.sizeMode === 'quantity' && stillMatching(firstFill.quantityText, prefill.quantity)],
    ]

    return candidates.filter(([, prefilled]) => prefilled).map(([field]) => field)
  }

  differsFrom(initialDraft: ContractTradeDraftDto): boolean {
    return JSON.stringify(this.draft) !== JSON.stringify(initialDraft)
  }

  private missingFieldMessage(): LocalizedTextVo | null {
    if (this.existingFills === null && this.draft.symbol.trim() === '') {
      return MISSING_SYMBOL_MESSAGE
    }

    if (this.leverage === null && this.draft.fills.some(fill => fill.sizeMode === 'margin')) {
      return UNREADABLE_LEVERAGE_MESSAGE
    }

    const unreadableIndex = this.draft.fills.findIndex(fill => this.toFillWriteDto(fill) === null)
    if (unreadableIndex !== -1) {
      return new LocalizedTextVo(
        `第 ${unreadableIndex + 1} 筆的價格與數量要填大於零的數字`,
        `Fill ${unreadableIndex + 1} needs a price and quantity greater than zero`)
    }

    const hasEntry = (this.existingFills ?? []).some(fill => fill.kind === 'entry')
      || this.draft.fills.some(fill => fill.kind === 'entry')

    return hasEntry ? null : MISSING_ENTRY_MESSAGE
  }

  private get leverage(): Decimal | null {
    if (this.draft.leverageText.trim() === '') {
      return new Decimal(1)
    }

    const leverage = new DecimalInputDomain(this.draft.leverageText).value

    return leverage === null || !leverage.greaterThan(0) ? null : leverage
  }

  private resolvedQuantity(fill: ContractTradeDraftFillDto): Decimal | null {
    const size = new DecimalInputDomain(fill.quantityText).value
    if (size === null || fill.sizeMode === 'quantity') {
      return size
    }

    const price = new DecimalInputDomain(fill.priceText).value
    const leverage = fill.sizeMode === 'margin' ? this.leverage : new Decimal(1)
    if (price === null || !price.greaterThan(0) || leverage === null) {
      return null
    }

    return size.times(leverage).dividedBy(price).toDecimalPlaces(CONVERTED_QUANTITY_DECIMAL_PLACES, Decimal.ROUND_DOWN)
  }

  private toFillWriteDto(fill: ContractTradeDraftFillDto): ContractTradeFillWriteDto | null {
    const price = new DecimalInputDomain(fill.priceText).value
    const quantity = this.resolvedQuantity(fill)
    if (price === null || quantity === null || !price.greaterThan(0) || !quantity.greaterThan(0)) {
      return null
    }

    return new ContractTradeFillWriteDto(
      fill.kind, fill.filledAt, price, quantity, fill.liquidity, new DecimalInputDomain(fill.feeText).value)
  }
}
