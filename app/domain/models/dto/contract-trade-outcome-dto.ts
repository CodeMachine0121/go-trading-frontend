import type { ContractTradeFigureVo } from '~/domain/models/vo/contract-trade-figure-vo'

export class ContractTradeOutcomeDto {
  constructor(
    public readonly figures: readonly ContractTradeFigureVo[],
    public readonly pricePathUnavailableMessage: string | null,
  ) {}

  figureLabelled(label: string): ContractTradeFigureVo | undefined {
    return this.figures.find(figure => figure.label === label)
  }
}
