import type { ContractTradeFigureVo } from '~/domain/models/vo/contract-trade-figure-vo'

export class ContractTradeOutcomeDto {
  constructor(
    public readonly figureGroups: readonly (readonly ContractTradeFigureVo[])[],
    public readonly pricePathUnavailableMessage: string | null,
  ) {}

  get figures(): readonly ContractTradeFigureVo[] {
    return this.figureGroups.flat()
  }

  figureLabelled(label: string): ContractTradeFigureVo | undefined {
    return this.figures.find(figure => figure.label === label)
  }
}
