import type { TradeFigureTone } from '~/domain/models/vo/trade-figure-vo'

export class TradeDistributionBarDto {
  constructor(
    public readonly label: string,
    public readonly count: number,
    public readonly tone: TradeFigureTone,
    public readonly widthPercentage: number,
  ) {}
}
