import type { TradeFigureTone } from '~/domain/models/vo/trade-figure-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class ContractTradeMistakeCostRowDto {
  constructor(
    public readonly tagName: string,
    public readonly tradeCountText: LocalizedTextVo,
    public readonly rMultipleText: string,
    public readonly tone: TradeFigureTone,
    public readonly widthPercentage: number,
  ) {}
}
