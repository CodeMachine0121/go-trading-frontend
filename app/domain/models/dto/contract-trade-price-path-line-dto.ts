import type Decimal from 'decimal.js'
import type { ContractTradeFigureTone } from '~/domain/models/vo/contract-trade-figure-vo'

export class ContractTradePricePathLineDto {
  constructor(
    public readonly price: Decimal,
    public readonly label: string,
    public readonly tone: ContractTradeFigureTone,
    public readonly priceText: string,
  ) {}
}
