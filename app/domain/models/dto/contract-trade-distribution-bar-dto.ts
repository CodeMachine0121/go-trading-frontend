import type { ContractTradeFigureTone } from '~/domain/models/vo/contract-trade-figure-vo'

export class ContractTradeDistributionBarDto {
  constructor(
    public readonly label: string,
    public readonly count: number,
    public readonly tone: ContractTradeFigureTone,
    public readonly widthPercentage: number,
  ) {}
}
