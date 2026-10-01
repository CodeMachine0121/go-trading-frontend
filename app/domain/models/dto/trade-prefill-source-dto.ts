import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'

export class TradePrefillSourceDto {
  constructor(
    public readonly badgeLabel: LocalizedTextVo,
    public readonly badgeTone: TradeBadgeTone,
    public readonly sourceLabel: LocalizedTextVo,
    public readonly ranAt: Date,
    public readonly referencePriceText: string | null,
    public readonly hint: LocalizedTextVo,
  ) {}
}
