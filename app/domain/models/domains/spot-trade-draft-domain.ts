import Decimal from 'decimal.js'
import type { SpotTradeDraftDto } from '~/domain/models/dto/spot-trade-draft-dto'
import type { SpotTradeDraftFillDto } from '~/domain/models/dto/spot-trade-draft-fill-dto'
import type { SpotTradeFillDto } from '~/domain/models/dto/spot-trade-fill-dto'
import type { SpotTradePrefillDto } from '~/domain/models/dto/spot-trade-prefill-dto'
import type { TradeFormField } from '~/domain/models/vo/trade-form-field-vo'
import { SpotTradeDraftPreviewDto } from '~/domain/models/dto/spot-trade-draft-preview-dto'
import { SpotTradeFillWriteDto } from '~/domain/models/dto/spot-trade-fill-write-dto'
import { SpotTradeRecordWriteDto } from '~/domain/models/dto/spot-trade-record-write-dto'
import { SpotTradeRecordSubmissionDto } from '~/domain/models/dto/spot-trade-record-submission-dto'
import { TradeRejectedError } from '~/domain/errors/trade-rejected-error'
import { TradeFormFieldVo } from '~/domain/models/vo/trade-form-field-vo'
import { DecimalInputDomain } from '~/domain/models/domains/decimal-input-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'
import { SpotTradeMarketDomain } from '~/domain/models/domains/spot-trade-market-domain'

const PERCENT = 100
const DISTANCE_FRACTION_DIGITS = 2
const SLIPPAGE_FRACTION_DIGITS = 2
const MISSING_SYMBOL_MESSAGE = '請填標的'
const MISSING_BUY_MESSAGE = '至少要有一筆填好買進價與數量的買進'
const MISSING_FILL_MESSAGE = '至少要有一筆填好價格與數量的買進或賣出'
const WHOLE_SHARES_MESSAGE = '台股數量以股計，必須是整數'

export class SpotTradeDraftDomain {
  constructor(
    private readonly draft: SpotTradeDraftDto,
    private readonly existingFills: readonly SpotTradeFillDto[] | null = null,
  ) {}

  toPreviewDto(): SpotTradeDraftPreviewDto {
    const pricedFills = [
      ...(this.existingFills ?? []).map(fill => ({ kind: fill.kind, price: fill.price, quantity: fill.quantity })),
      ...this.draft.fills.flatMap((fill) => {
        const price = new DecimalInputDomain(fill.priceText).value
        const quantity = new DecimalInputDomain(fill.quantityText).value

        return price === null || quantity === null ? [] : [{ kind: fill.kind, price, quantity }]
      }),
    ]
    const buys = pricedFills.filter(fill => fill.kind === 'buy')
    const boughtQuantity = buys.reduce((total, buy) => total.plus(buy.quantity), new Decimal(0))
    const soldQuantity = pricedFills
      .filter(fill => fill.kind === 'sell')
      .reduce((total, sell) => total.plus(sell.quantity), new Decimal(0))
    const averageBuyPrice = boughtQuantity.isZero()
      ? null
      : buys.reduce((total, buy) => total.plus(buy.price.times(buy.quantity)), new Decimal(0)).dividedBy(boughtQuantity)
    const displayedFractionDigits = Math.max(0, ...buys.map(buy => buy.price.decimalPlaces())) + 1
    const plannedStopLoss = new DecimalInputDomain(this.draft.plannedStopLossText).value
    const plannedTakeProfit = new DecimalInputDomain(this.draft.plannedTakeProfitText).value
    const referencePrice = this.draft.referencePrice
    const distanceText = (level: Decimal | null) => averageBuyPrice === null || level === null
      ? null
      : `${level.greaterThanOrEqualTo(averageBuyPrice) ? '往上' : '往下'} ${new JournalNumberDomain(
        level.minus(averageBuyPrice).abs().dividedBy(averageBuyPrice).times(PERCENT)).percentage(DISTANCE_FRACTION_DIGITS)}`
    const wholeSharesOnly = this.draft.market !== null && new SpotTradeMarketDomain(this.draft.market).wholeSharesOnly
    const fractionalShares = wholeSharesOnly
      && this.draft.fills.some(fill => !(new DecimalInputDomain(fill.quantityText).value?.isInteger() ?? true))

    return new SpotTradeDraftPreviewDto(
      new JournalNumberDomain(boughtQuantity.minus(soldQuantity)).quantity(),
      averageBuyPrice === null ? null : new JournalNumberDomain(averageBuyPrice).priceAt(displayedFractionDigits),
      distanceText(plannedStopLoss),
      averageBuyPrice === null || plannedStopLoss === null
        ? null
        : new JournalNumberDomain(averageBuyPrice.minus(plannedStopLoss).abs().times(boughtQuantity)).amount(),
      distanceText(plannedTakeProfit),
      averageBuyPrice === null || referencePrice === null || referencePrice.isZero()
        ? null
        : `比參考價${averageBuyPrice.greaterThanOrEqualTo(referencePrice) ? '高' : '低'} ${new JournalNumberDomain(
          averageBuyPrice.minus(referencePrice).abs().dividedBy(referencePrice).times(PERCENT)).percentage(SLIPPAGE_FRACTION_DIGITS)}（滑點）`,
      fractionalShares ? WHOLE_SHARES_MESSAGE : null,
      this.missingFieldMessage(),
    )
  }

  toRecordSubmission(): SpotTradeRecordSubmissionDto {
    const fillWriteDtos = this.toFillWriteDtos()
    const firstBuyIndex = fillWriteDtos.findIndex(fill => fill.kind === 'buy')
    const firstBuyFill = fillWriteDtos[firstBuyIndex]
    if (firstBuyFill === undefined) {
      throw new TradeRejectedError(MISSING_BUY_MESSAGE, null)
    }

    return new SpotTradeRecordSubmissionDto(
      new SpotTradeRecordWriteDto(
        this.draft.symbol.trim().toUpperCase(),
        firstBuyFill,
        new DecimalInputDomain(this.draft.plannedStopLossText).value,
        new DecimalInputDomain(this.draft.plannedTakeProfitText).value,
        this.draft.entryReason.trim(),
        this.draft.confidence,
        this.draft.tradingStrategyId,
        this.draft.setupTagIds,
        this.draft.journalLinkIdentifier,
      ),
      fillWriteDtos.filter((_, index) => index !== firstBuyIndex),
    )
  }

  toFillWriteDtos(): [SpotTradeFillWriteDto, ...SpotTradeFillWriteDto[]] {
    const missingFieldMessage = this.missingFieldMessage()
    if (missingFieldMessage !== null) {
      throw new TradeRejectedError(missingFieldMessage, null)
    }

    if (this.toPreviewDto().wholeSharesMessage !== null) {
      throw new TradeRejectedError(WHOLE_SHARES_MESSAGE, new TradeFormFieldVo('fillQuantity'))
    }

    const [firstWriteDto, ...otherWriteDtos] = this.draft.fills
      .map(fill => this.toFillWriteDto(fill))
      .filter((writeDto): writeDto is SpotTradeFillWriteDto => writeDto !== null)
    if (firstWriteDto === undefined) {
      throw new TradeRejectedError(MISSING_FILL_MESSAGE, null)
    }

    return [firstWriteDto, ...otherWriteDtos]
  }

  prefilledFields(prefill: SpotTradePrefillDto): TradeFormField[] {
    const firstFill = this.draft.fills[0]
    const stillMatching = (text: string, prefilledValue: Decimal | null) =>
      prefilledValue !== null && text.trim() !== '' && text.trim() === prefilledValue.toString()
    const candidates: [TradeFormField, boolean][] = [
      ['symbol', this.draft.symbol === prefill.symbol],
      ['plannedStopLossPrice', stillMatching(this.draft.plannedStopLossText, prefill.plannedStopLossPrice)],
      ['plannedTakeProfitPrice', stillMatching(this.draft.plannedTakeProfitText, prefill.plannedTakeProfitPrice)],
      ['tradingStrategy', prefill.tradingStrategyId !== null && this.draft.tradingStrategyId === prefill.tradingStrategyId],
      ['fillPrice', stillMatching(firstFill?.priceText ?? '', prefill.price)],
      ['fillQuantity', stillMatching(firstFill?.quantityText ?? '', prefill.quantity)],
    ]

    return candidates.filter(([, prefilled]) => prefilled).map(([field]) => field)
  }

  differsFrom(initialDraft: SpotTradeDraftDto): boolean {
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

    const hasBuy = (this.existingFills ?? []).some(fill => fill.kind === 'buy')
      || this.draft.fills.some(fill => fill.kind === 'buy')

    return hasBuy ? null : MISSING_BUY_MESSAGE
  }

  private toFillWriteDto(fill: SpotTradeDraftFillDto): SpotTradeFillWriteDto | null {
    const price = new DecimalInputDomain(fill.priceText).value
    const quantity = new DecimalInputDomain(fill.quantityText).value
    if (price === null || quantity === null || !price.greaterThan(0) || !quantity.greaterThan(0)) {
      return null
    }

    return new SpotTradeFillWriteDto(fill.kind, fill.filledAt, price, quantity, new DecimalInputDomain(fill.feeText).value)
  }
}
