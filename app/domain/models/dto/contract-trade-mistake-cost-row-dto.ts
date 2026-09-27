import type { ContractTradeFigureTone } from '~/domain/models/vo/contract-trade-figure-vo'

export class ContractTradeMistakeCostRowDto {
  constructor(
    public readonly tagName: string,
    public readonly tradeCountText: string,
    public readonly rMultipleText: string,
    public readonly tone: ContractTradeFigureTone,
    public readonly widthPercentage: number,
  ) {}
}
