import type { TradeTagKind } from '~/domain/models/vo/trade-tag-kind-vo'

export class TradeTagDto {
  constructor(
    public readonly id: number,
    public readonly kind: TradeTagKind,
    public readonly name: string,
  ) {}
}
