import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'

export class TradeTagChipVo {
  constructor(
    public readonly name: string,
    public readonly tone: TradeBadgeTone,
  ) {}
}
