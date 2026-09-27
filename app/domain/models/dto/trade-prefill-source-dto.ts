import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'

export class TradePrefillSourceDto {
  constructor(
    public readonly badgeLabel: string,
    public readonly badgeTone: TradeBadgeTone,
    public readonly sourceLabel: string,
    public readonly ranAt: Date,
    public readonly referencePriceText: string | null,
    public readonly hint: string,
  ) {}
}
