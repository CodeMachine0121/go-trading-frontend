import type Decimal from 'decimal.js'
import type { TradeFigureTone } from '~/domain/models/vo/trade-figure-vo'

export class TradePricePathLineDto {
  constructor(
    public readonly price: Decimal,
    public readonly label: string,
    public readonly tone: TradeFigureTone,
    public readonly priceText: string,
  ) {}
}
