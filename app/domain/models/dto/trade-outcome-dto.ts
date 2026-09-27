import type { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'

export class TradeOutcomeDto {
  constructor(
    public readonly figureGroups: readonly (readonly TradeFigureVo[])[],
    public readonly pricePathUnavailableMessage: string | null,
  ) {}

  get figures(): readonly TradeFigureVo[] {
    return this.figureGroups.flat()
  }

  figureLabelled(label: string): TradeFigureVo | undefined {
    return this.figures.find(figure => figure.label === label)
  }
}
