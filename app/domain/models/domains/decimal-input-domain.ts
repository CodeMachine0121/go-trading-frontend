import Decimal from 'decimal.js'

export class DecimalInputDomain {
  constructor(private readonly text: string) {}

  get value(): Decimal | null {
    const trimmed = this.text.trim().replaceAll(',', '')
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
