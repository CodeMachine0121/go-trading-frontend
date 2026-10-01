import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class TradeSourceDto {
  constructor(
    public readonly label: LocalizedTextVo,
    public readonly referencePriceText: LocalizedTextVo,
    public readonly suggestedStopLossPriceText: LocalizedTextVo,
    public readonly suggestedTakeProfitPriceText: LocalizedTextVo,
  ) {}
}
