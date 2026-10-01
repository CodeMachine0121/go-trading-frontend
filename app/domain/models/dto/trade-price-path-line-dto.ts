import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type Decimal from 'decimal.js'
import type { TradeFigureTone } from '~/domain/models/vo/trade-figure-vo'

export class TradePricePathLineDto {
  constructor(
    public readonly price: Decimal,
    public readonly label: LocalizedTextVo,
    public readonly tone: TradeFigureTone,
    public readonly priceText: string,
  ) {}
}
