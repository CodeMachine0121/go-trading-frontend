import type { TradeFigureTone } from '~/domain/models/vo/trade-figure-vo'

export class ContractTradeMistakeCostRowDto {
  constructor(
    public readonly tagName: string,
    public readonly tradeCountText: string,
    public readonly rMultipleText: string,
    public readonly tone: TradeFigureTone,
    public readonly widthPercentage: number,
  ) {}
}
