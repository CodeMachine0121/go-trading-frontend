import type Decimal from 'decimal.js'
import type { ContractTradeFigureTone } from '~/domain/models/vo/trade-figure-vo'

const AMOUNT_FRACTION_DIGITS = 2
const MAXIMUM_PRICE_FRACTION_DIGITS = 8
const MINUS_SIGN = '−'

export class JournalNumberDomain {
  constructor(private readonly value: Decimal) {}

  amount(): string {
    const roundedAway = this.value.toDecimalPlaces(AMOUNT_FRACTION_DIGITS).isZero()

    return this.grouped(this.value.abs().toFixed(AMOUNT_FRACTION_DIGITS), this.value.isNegative() && !roundedAway)
  }

  signedAmount(): string {
    const rounded = this.value.toDecimalPlaces(AMOUNT_FRACTION_DIGITS)
    if (rounded.isZero()) {
      return this.amount()
    }

    return rounded.isNegative() ? this.amount() : `+${this.amount()}`
  }

  price(): string {
    const trimmed = this.value.abs().toDecimalPlaces(MAXIMUM_PRICE_FRACTION_DIGITS).toFixed()

    return this.grouped(trimmed, this.value.isNegative())
  }

  priceAt(fractionDigits: number): string {
    const trimmed = this.value.abs().toDecimalPlaces(fractionDigits).toFixed()

    return this.grouped(trimmed, this.value.isNegative())
  }

  quantity(): string {
    return this.value.toDecimalPlaces(MAXIMUM_PRICE_FRACTION_DIGITS).toFixed()
  }

  rMultiple(): string {
    const rounded = this.value.toDecimalPlaces(AMOUNT_FRACTION_DIGITS)
    const digits = rounded.abs().toFixed(AMOUNT_FRACTION_DIGITS)
    if (rounded.isZero()) {
      return `${digits}R`
    }

    return rounded.isNegative() ? `${MINUS_SIGN}${digits}R` : `+${digits}R`
  }

  percentage(fractionDigits: number): string {
    const rounded = this.value.toDecimalPlaces(fractionDigits)
    const digits = rounded.abs().toFixed(fractionDigits)

    return rounded.isNegative() && !rounded.isZero() ? `${MINUS_SIGN}${digits}%` : `${digits}%`
  }

  tone(): ContractTradeFigureTone {
    if (this.value.isZero()) {
      return 'neutral'
    }

    return this.value.isNegative() ? 'danger' : 'success'
  }

  private grouped(unsignedDigits: string, negative: boolean): string {
    const [integerPart = '0', fractionPart] = unsignedDigits.split('.')
    const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    const body = fractionPart === undefined ? groupedInteger : `${groupedInteger}.${fractionPart}`

    return negative ? `${MINUS_SIGN}${body}` : body
  }
}
